# Arquitetura iOS + Sistema Freemium - FisioFlow

## Guia Técnico Detalhado

---

## 📱 **ARQUITETURA iOS NATIVA**

### **1. ESTRUTURA DO PROJETO**

```
FisioFlow-iOS/
├── FisioFlow/
│   ├── App/
│   │   ├── FisioFlowApp.swift
│   │   ├── AppDelegate.swift
│   │   └── SceneDelegate.swift
│   ├── Core/
│   │   ├── Network/
│   │   │   ├── APIClient.swift
│   │   │   ├── NetworkManager.swift
│   │   │   └── Endpoints.swift
│   │   ├── Storage/
│   │   │   ├── CoreDataManager.swift
│   │   │   ├── KeychainManager.swift
│   │   │   └── UserDefaults+Extensions.swift
│   │   ├── Security/
│   │   │   ├── BiometricAuth.swift
│   │   │   ├── TokenManager.swift
│   │   │   └── CryptoManager.swift
│   │   └── Utils/
│   │       ├── Logger.swift
│   │       ├── Constants.swift
│   │       └── Extensions/
│   ├── Features/
│   │   ├── Authentication/
│   │   │   ├── Views/
│   │   │   ├── ViewModels/
│   │   │   └── Models/
│   │   ├── Dashboard/
│   │   ├── Patients/
│   │   ├── Exercises/
│   │   ├── Calendar/
│   │   ├── Chat/
│   │   └── Settings/
│   ├── Shared/
│   │   ├── Components/
│   │   ├── Modifiers/
│   │   └── Resources/
│   └── Resources/
│       ├── Assets.xcassets
│       ├── Localizable.strings
│       └── Info.plist
├── FisioFlowTests/
├── FisioFlowUITests/
└── Packages/
    ├── NetworkKit/
    ├── DesignSystem/
    └── AnalyticsKit/
```

### **2. ARQUITETURA MVVM + COMBINE**

#### **2.1 Base ViewModel**

```swift
import Foundation
import Combine

class BaseViewModel: ObservableObject {
    @Published var isLoading = false
    @Published var errorMessage: String?

    var cancellables = Set<AnyCancellable>()

    func handleError(_ error: Error) {
        DispatchQueue.main.async {
            self.isLoading = false
            self.errorMessage = error.localizedDescription
        }
    }

    func startLoading() {
        DispatchQueue.main.async {
            self.isLoading = true
            self.errorMessage = nil
        }
    }

    func stopLoading() {
        DispatchQueue.main.async {
            self.isLoading = false
        }
    }
}
```

#### **2.2 Network Layer**

```swift
import Foundation
import Combine

protocol APIClientProtocol {
    func request<T: Codable>(
        endpoint: Endpoint,
        responseType: T.Type
    ) -> AnyPublisher<T, APIError>
}

class APIClient: APIClientProtocol {
    private let session: URLSession
    private let tokenManager: TokenManager

    init(session: URLSession = .shared, tokenManager: TokenManager) {
        self.session = session
        self.tokenManager = tokenManager
    }

    func request<T: Codable>(
        endpoint: Endpoint,
        responseType: T.Type
    ) -> AnyPublisher<T, APIError> {
        guard let url = endpoint.url else {
            return Fail(error: APIError.invalidURL)
                .eraseToAnyPublisher()
        }

        var request = URLRequest(url: url)
        request.httpMethod = endpoint.method.rawValue
        request.allHTTPHeaderFields = endpoint.headers

        // Add authentication token
        if let token = tokenManager.accessToken {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }

        return session.dataTaskPublisher(for: request)
            .map(\.data)
            .decode(type: T.self, decoder: JSONDecoder())
            .mapError { error in
                if error is DecodingError {
                    return APIError.decodingError
                } else {
                    return APIError.networkError(error)
                }
            }
            .eraseToAnyPublisher()
    }
}
```

### **3. CORE DATA + OFFLINE SYNC**

#### **3.1 Core Data Stack**

```swift
import CoreData
import CloudKit

class CoreDataManager {
    static let shared = CoreDataManager()

    lazy var persistentContainer: NSPersistentCloudKitContainer = {
        let container = NSPersistentCloudKitContainer(name: "FisioFlow")

        // Configure for CloudKit
        let storeDescription = container.persistentStoreDescriptions.first
        storeDescription?.setOption(true as NSNumber, forKey: NSPersistentHistoryTrackingKey)
        storeDescription?.setOption(true as NSNumber, forKey: NSPersistentStoreRemoteChangeNotificationPostOptionKey)

        container.loadPersistentStores { _, error in
            if let error = error {
                fatalError("Core Data error: \(error)")
            }
        }

        container.viewContext.automaticallyMergesChangesFromParent = true
        return container
    }()

    var context: NSManagedObjectContext {
        return persistentContainer.viewContext
    }

    func save() {
        if context.hasChanges {
            do {
                try context.save()
            } catch {
                print("Save error: \(error)")
            }
        }
    }
}
```

#### **3.2 Sync Manager**

```swift
import Foundation
import Combine

class SyncManager: ObservableObject {
    @Published var syncStatus: SyncStatus = .idle
    @Published var lastSyncDate: Date?

    private let apiClient: APIClientProtocol
    private let coreDataManager: CoreDataManager
    private var cancellables = Set<AnyCancellable>()

    enum SyncStatus {
        case idle
        case syncing
        case success
        case error(String)
    }

    init(apiClient: APIClientProtocol, coreDataManager: CoreDataManager) {
        self.apiClient = apiClient
        self.coreDataManager = coreDataManager
        setupPeriodicSync()
    }

    func syncAll() {
        syncStatus = .syncing

        Publishers.Zip4(
            syncPatients(),
            syncAppointments(),
            syncExercises(),
            syncPrescriptions()
        )
        .sink(
            receiveCompletion: { [weak self] completion in
                switch completion {
                case .finished:
                    self?.syncStatus = .success
                    self?.lastSyncDate = Date()
                case .failure(let error):
                    self?.syncStatus = .error(error.localizedDescription)
                }
            },
            receiveValue: { _ in }
        )
        .store(in: &cancellables)
    }

    private func setupPeriodicSync() {
        Timer.publish(every: 300, on: .main, in: .common) // 5 minutes
            .autoconnect()
            .sink { [weak self] _ in
                if UIApplication.shared.applicationState == .active {
                    self?.syncAll()
                }
            }
            .store(in: &cancellables)
    }
}
```

### **4. BIOMETRIC AUTHENTICATION**

```swift
import LocalAuthentication
import Foundation

class BiometricAuthManager {
    enum BiometricType {
        case none
        case touchID
        case faceID
    }

    enum BiometricError: Error {
        case notAvailable
        case notEnrolled
        case failed
    }

    static func biometricType() -> BiometricType {
        let context = LAContext()
        var error: NSError?

        guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
            return .none
        }

        switch context.biometryType {
        case .none:
            return .none
        case .touchID:
            return .touchID
        case .faceID:
            return .faceID
        @unknown default:
            return .none
        }
    }

    static func authenticate(reason: String) async throws -> Bool {
        let context = LAContext()

        do {
            let result = try await context.evaluatePolicy(
                .deviceOwnerAuthenticationWithBiometrics,
                localizedReason: reason
            )
            return result
        } catch {
            throw BiometricError.failed
        }
    }
}
```

---

## 💰 **SISTEMA FREEMIUM DETALHADO**

### **1. ESTRUTURA DE PLANOS**

```swift
enum SubscriptionPlan: String, CaseIterable {
    case free = "free"
    case silver = "silver"
    case gold = "gold"
    case platinum = "platinum"

    var displayName: String {
        switch self {
        case .free: return "Gratuito"
        case .silver: return "Silver"
        case .gold: return "Gold"
        case .platinum: return "Platinum"
        }
    }

    var monthlyPrice: Decimal {
        switch self {
        case .free: return 0
        case .silver: return 97
        case .gold: return 197
        case .platinum: return 397
        }
    }

    var limits: PlanLimits {
        switch self {
        case .free:
            return PlanLimits(
                maxTherapists: 1,
                maxPatients: 10,
                maxAppointmentsPerMonth: 50,
                hasAIFeatures: false,
                hasAdvancedReports: false,
                hasAPIAccess: false,
                storageGB: 1
            )
        case .silver:
            return PlanLimits(
                maxTherapists: 3,
                maxPatients: 50,
                maxAppointmentsPerMonth: 200,
                hasAIFeatures: false,
                hasAdvancedReports: true,
                hasAPIAccess: false,
                storageGB: 5
            )
        case .gold:
            return PlanLimits(
                maxTherapists: 10,
                maxPatients: 200,
                maxAppointmentsPerMonth: 1000,
                hasAIFeatures: true,
                hasAdvancedReports: true,
                hasAPIAccess: false,
                storageGB: 20
            )
        case .platinum:
            return PlanLimits(
                maxTherapists: -1, // unlimited
                maxPatients: -1,
                maxAppointmentsPerMonth: -1,
                hasAIFeatures: true,
                hasAdvancedReports: true,
                hasAPIAccess: true,
                storageGB: 100
            )
        }
    }
}

struct PlanLimits {
    let maxTherapists: Int // -1 = unlimited
    let maxPatients: Int
    let maxAppointmentsPerMonth: Int
    let hasAIFeatures: Bool
    let hasAdvancedReports: Bool
    let hasAPIAccess: Bool
    let storageGB: Int
}
```

### **2. PAYWALL INTELIGENTE**

```swift
import SwiftUI

class PaywallManager: ObservableObject {
    @Published var shouldShowPaywall = false
    @Published var paywallContext: PaywallContext?

    private let subscriptionManager: SubscriptionManager
    private let analyticsManager: AnalyticsManager

    enum PaywallContext {
        case patientLimitReached
        case aiFeatureAccess
        case advancedReports
        case storageLimit
        case therapistLimit

        var title: String {
            switch self {
            case .patientLimitReached:
                return "Limite de Pacientes Atingido"
            case .aiFeatureAccess:
                return "Recursos de IA Disponíveis"
            case .advancedReports:
                return "Relatórios Avançados"
            case .storageLimit:
                return "Limite de Armazenamento"
            case .therapistLimit:
                return "Adicionar Mais Fisioterapeutas"
            }
        }

        var description: String {
            switch self {
            case .patientLimitReached:
                return "Você atingiu o limite de pacientes do seu plano atual. Faça upgrade para continuar adicionando pacientes."
            case .aiFeatureAccess:
                return "Desbloqueie insights preditivos e análises avançadas com IA para melhorar seus resultados clínicos."
            case .advancedReports:
                return "Acesse relatórios detalhados e analytics para otimizar sua clínica."
            case .storageLimit:
                return "Seu armazenamento está quase cheio. Faça upgrade para mais espaço."
            case .therapistLimit:
                return "Adicione mais fisioterapeutas à sua equipe com um plano superior."
            }
        }

        var recommendedPlan: SubscriptionPlan {
            switch self {
            case .patientLimitReached, .therapistLimit:
                return .silver
            case .advancedReports, .storageLimit:
                return .gold
            case .aiFeatureAccess:
                return .platinum
            }
        }
    }

    func checkLimitsAndShowPaywall(for action: UserAction) {
        guard let currentPlan = subscriptionManager.currentPlan else { return }

        let limits = currentPlan.limits
        let usage = subscriptionManager.currentUsage

        switch action {
        case .addPatient:
            if limits.maxPatients != -1 && usage.patientCount >= limits.maxPatients {
                showPaywall(context: .patientLimitReached)
            }
        case .accessAIFeature:
            if !limits.hasAIFeatures {
                showPaywall(context: .aiFeatureAccess)
            }
        case .generateAdvancedReport:
            if !limits.hasAdvancedReports {
                showPaywall(context: .advancedReports)
            }
        case .uploadFile(let sizeGB):
            if usage.storageUsedGB + sizeGB > limits.storageGB {
                showPaywall(context: .storageLimit)
            }
        case .addTherapist:
            if limits.maxTherapists != -1 && usage.therapistCount >= limits.maxTherapists {
                showPaywall(context: .therapistLimit)
            }
        }
    }

    private func showPaywall(context: PaywallContext) {
        paywallContext = context
        shouldShowPaywall = true

        // Analytics
        analyticsManager.track(event: "paywall_shown", properties: [
            "context": context,
            "current_plan": subscriptionManager.currentPlan?.rawValue ?? "none"
        ])
    }
}

enum UserAction {
    case addPatient
    case accessAIFeature
    case generateAdvancedReport
    case uploadFile(sizeGB: Double)
    case addTherapist
}
```

### **3. IN-APP PURCHASE MANAGER**

```swift
import StoreKit
import Combine

class SubscriptionManager: NSObject, ObservableObject {
    @Published var currentPlan: SubscriptionPlan?
    @Published var availableProducts: [SKProduct] = []
    @Published var purchaseState: PurchaseState = .idle
    @Published var currentUsage = UsageMetrics()

    enum PurchaseState {
        case idle
        case purchasing
        case purchased
        case failed(Error)
        case restored
    }

    private let productIdentifiers: Set<String> = [
        "com.fisioflow.silver.monthly",
        "com.fisioflow.gold.monthly",
        "com.fisioflow.platinum.monthly",
        "com.fisioflow.silver.yearly",
        "com.fisioflow.gold.yearly",
        "com.fisioflow.platinum.yearly"
    ]

    override init() {
        super.init()
        SKPaymentQueue.default().add(self)
        loadProducts()
        checkCurrentSubscription()
    }

    deinit {
        SKPaymentQueue.default().remove(self)
    }

    func loadProducts() {
        let request = SKProductsRequest(productIdentifiers: productIdentifiers)
        request.delegate = self
        request.start()
    }

    func purchase(product: SKProduct) {
        guard SKPaymentQueue.canMakePayments() else {
            purchaseState = .failed(SubscriptionError.cannotMakePayments)
            return
        }

        purchaseState = .purchasing
        let payment = SKPayment(product: product)
        SKPaymentQueue.default().add(payment)
    }

    func restorePurchases() {
        SKPaymentQueue.default().restoreCompletedTransactions()
    }

    private func checkCurrentSubscription() {
        // Check with server for current subscription status
        // This should validate the receipt with your backend
    }
}

// MARK: - SKProductsRequestDelegate
extension SubscriptionManager: SKProductsRequestDelegate {
    func productsRequest(_ request: SKProductsRequest, didReceive response: SKProductsResponse) {
        DispatchQueue.main.async {
            self.availableProducts = response.products
        }
    }
}

// MARK: - SKPaymentTransactionObserver
extension SubscriptionManager: SKPaymentTransactionObserver {
    func paymentQueue(_ queue: SKPaymentQueue, updatedTransactions transactions: [SKPaymentTransaction]) {
        for transaction in transactions {
            switch transaction.transactionState {
            case .purchased:
                handlePurchased(transaction)
            case .failed:
                handleFailed(transaction)
            case .restored:
                handleRestored(transaction)
            case .deferred, .purchasing:
                break
            @unknown default:
                break
            }
        }
    }

    private func handlePurchased(_ transaction: SKPaymentTransaction) {
        // Validate receipt with server
        validateReceipt(transaction) { [weak self] success in
            DispatchQueue.main.async {
                if success {
                    self?.purchaseState = .purchased
                    self?.updateSubscriptionStatus()
                } else {
                    self?.purchaseState = .failed(SubscriptionError.validationFailed)
                }
                SKPaymentQueue.default().finishTransaction(transaction)
            }
        }
    }

    private func handleFailed(_ transaction: SKPaymentTransaction) {
        DispatchQueue.main.async {
            self.purchaseState = .failed(transaction.error ?? SubscriptionError.unknown)
            SKPaymentQueue.default().finishTransaction(transaction)
        }
    }

    private func handleRestored(_ transaction: SKPaymentTransaction) {
        DispatchQueue.main.async {
            self.purchaseState = .restored
            self.updateSubscriptionStatus()
            SKPaymentQueue.default().finishTransaction(transaction)
        }
    }
}

struct UsageMetrics {
    var patientCount: Int = 0
    var therapistCount: Int = 1
    var appointmentsThisMonth: Int = 0
    var storageUsedGB: Double = 0
}

enum SubscriptionError: Error {
    case cannotMakePayments
    case validationFailed
    case unknown
}
```

### **4. FEATURE FLAGS SYSTEM**

```swift
import Foundation

class FeatureFlagManager: ObservableObject {
    @Published var flags: [String: Any] = [:]

    private let remoteConfig: RemoteConfigProtocol
    private let subscriptionManager: SubscriptionManager

    init(remoteConfig: RemoteConfigProtocol, subscriptionManager: SubscriptionManager) {
        self.remoteConfig = remoteConfig
        self.subscriptionManager = subscriptionManager
        loadFlags()
    }

    func isFeatureEnabled(_ feature: Feature) -> Bool {
        // Check subscription plan first
        guard let currentPlan = subscriptionManager.currentPlan else {
            return feature.availableInFreePlan
        }

        // Check if feature is available in current plan
        guard feature.isAvailableIn(plan: currentPlan) else {
            return false
        }

        // Check remote config for feature flags
        let flagKey = "feature_\(feature.rawValue)_enabled"
        return flags[flagKey] as? Bool ?? feature.defaultEnabled
    }

    func getFeatureConfig<T>(_ feature: Feature, key: String, defaultValue: T) -> T {
        let configKey = "feature_\(feature.rawValue)_\(key)"
        return flags[configKey] as? T ?? defaultValue
    }

    private func loadFlags() {
        remoteConfig.fetchFlags { [weak self] result in
            switch result {
            case .success(let flags):
                DispatchQueue.main.async {
                    self?.flags = flags
                }
            case .failure(let error):
                print("Failed to load feature flags: \(error)")
            }
        }
    }
}

enum Feature: String, CaseIterable {
    case aiPredictiveAnalytics = "ai_predictive_analytics"
    case advancedReports = "advanced_reports"
    case apiAccess = "api_access"
    case videoConsultations = "video_consultations"
    case customBranding = "custom_branding"
    case multiLocation = "multi_location"

    var availableInFreePlan: Bool {
        switch self {
        case .aiPredictiveAnalytics, .advancedReports, .apiAccess, .videoConsultations, .customBranding, .multiLocation:
            return false
        }
    }

    var defaultEnabled: Bool {
        return true
    }

    func isAvailableIn(plan: SubscriptionPlan) -> Bool {
        switch self {
        case .aiPredictiveAnalytics:
            return plan == .gold || plan == .platinum
        case .advancedReports:
            return plan == .silver || plan == .gold || plan == .platinum
        case .apiAccess, .customBranding, .multiLocation:
            return plan == .platinum
        case .videoConsultations:
            return plan == .gold || plan == .platinum
        }
    }
}
```

---

## 🔒 **SEGURANÇA E COMPLIANCE**

### **1. KEYCHAIN MANAGER**

```swift
import Security
import Foundation

class KeychainManager {
    static let shared = KeychainManager()

    private let service = "com.fisioflow.app"

    enum KeychainError: Error {
        case duplicateEntry
        case unknown(OSStatus)
        case itemNotFound
        case invalidData
    }

    func save(key: String, data: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data
        ]

        let status = SecItemAdd(query as CFDictionary, nil)

        if status == errSecDuplicateItem {
            try update(key: key, data: data)
        } else if status != errSecSuccess {
            throw KeychainError.unknown(status)
        }
    }

    func load(key: String) throws -> Data {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)

        if status == errSecItemNotFound {
            throw KeychainError.itemNotFound
        } else if status != errSecSuccess {
            throw KeychainError.unknown(status)
        }

        guard let data = result as? Data else {
            throw KeychainError.invalidData
        }

        return data
    }

    func delete(key: String) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let status = SecItemDelete(query as CFDictionary)

        if status != errSecSuccess && status != errSecItemNotFound {
            throw KeychainError.unknown(status)
        }
    }

    private func update(key: String, data: Data) throws {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        let attributes: [String: Any] = [
            kSecValueData as String: data
        ]

        let status = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)

        if status != errSecSuccess {
            throw KeychainError.unknown(status)
        }
    }
}

// MARK: - Convenience Methods
extension KeychainManager {
    func saveToken(_ token: String, for key: String) throws {
        guard let data = token.data(using: .utf8) else {
            throw KeychainError.invalidData
        }
        try save(key: key, data: data)
    }

    func loadToken(for key: String) throws -> String {
        let data = try load(key: key)
        guard let token = String(data: data, encoding: .utf8) else {
            throw KeychainError.invalidData
        }
        return token
    }
}
```

### **2. AUDIT LOGGING**

```swift
import Foundation

class AuditLogger {
    static let shared = AuditLogger()

    private let apiClient: APIClientProtocol
    private let queue = DispatchQueue(label: "audit.logger", qos: .utility)

    init(apiClient: APIClientProtocol = APIClient.shared) {
        self.apiClient = apiClient
    }

    func log(action: AuditAction, details: [String: Any] = [:]) {
        queue.async {
            let auditLog = AuditLog(
                id: UUID().uuidString,
                timestamp: Date(),
                userId: UserManager.shared.currentUser?.id ?? "unknown",
                action: action,
                details: details,
                deviceInfo: self.getDeviceInfo()
            )

            self.sendToServer(auditLog)
            self.saveLocally(auditLog)
        }
    }

    private func getDeviceInfo() -> [String: Any] {
        return [
            "device_model": UIDevice.current.model,
            "os_version": UIDevice.current.systemVersion,
            "app_version": Bundle.main.infoDictionary?["CFBundleShortVersionString"] as? String ?? "unknown"
        ]
    }

    private func sendToServer(_ log: AuditLog) {
        // Send to server for compliance
    }

    private func saveLocally(_ log: AuditLog) {
        // Save locally for offline scenarios
    }
}

enum AuditAction: String {
    case login = "user_login"
    case logout = "user_logout"
    case viewPatient = "view_patient"
    case editPatient = "edit_patient"
    case createAppointment = "create_appointment"
    case accessSensitiveData = "access_sensitive_data"
    case exportData = "export_data"
    case deleteData = "delete_data"
}

struct AuditLog: Codable {
    let id: String
    let timestamp: Date
    let userId: String
    let action: AuditAction
    let details: [String: Any]
    let deviceInfo: [String: Any]

    enum CodingKeys: String, CodingKey {
        case id, timestamp, userId, action, details, deviceInfo
    }
}
```

---

## 📊 **ANALYTICS E MÉTRICAS**

### **1. ANALYTICS MANAGER**

```swift
import Foundation

class AnalyticsManager {
    static let shared = AnalyticsManager()

    private let providers: [AnalyticsProvider]

    init(providers: [AnalyticsProvider] = [FirebaseAnalytics(), MixpanelAnalytics()]) {
        self.providers = providers
    }

    func track(event: String, properties: [String: Any] = [:]) {
        let enrichedProperties = enrichProperties(properties)

        providers.forEach { provider in
            provider.track(event: event, properties: enrichedProperties)
        }
    }

    func identify(userId: String, traits: [String: Any] = [:]) {
        providers.forEach { provider in
            provider.identify(userId: userId, traits: traits)
        }
    }

    func screen(name: String, properties: [String: Any] = [:]) {
        providers.forEach { provider in
            provider.screen(name: name, properties: properties)
        }
    }

    private func enrichProperties(_ properties: [String: Any]) -> [String: Any] {
        var enriched = properties

        // Add common properties
        enriched["platform"] = "ios"
        enriched["app_version"] = Bundle.main.infoDictionary?["CFBundleShortVersionString"]
        enriched["subscription_plan"] = SubscriptionManager.shared.currentPlan?.rawValue
        enriched["user_role"] = UserManager.shared.currentUser?.role.rawValue
        enriched["tenant_id"] = UserManager.shared.currentUser?.tenantId

        return enriched
    }
}

protocol AnalyticsProvider {
    func track(event: String, properties: [String: Any])
    func identify(userId: String, traits: [String: Any])
    func screen(name: String, properties: [String: Any])
}
```

---

## 🚀 **PRÓXIMOS PASSOS**

### **IMPLEMENTAÇÃO PRIORITÁRIA:**

1. **Semana 1-2:** Setup do projeto iOS + autenticação básica
2. **Semana 3-4:** Core Data + sincronização offline
3. **Semana 5-6:** Funcionalidades principais (pacientes, agenda)
4. **Semana 7-8:** Sistema de pagamentos + paywall
5. **Semana 9-10:** Polimento + testes
6. **Semana 11-12:** App Store submission + marketing

### **MÉTRICAS DE SUCESSO:**

- **Conversão Freemium → Paid:** 15-20%
- **Retention Rate (30 dias):** >80%
- **App Store Rating:** >4.5 estrelas
- **Crash Rate:** <0.1%
- **Customer Satisfaction:** >90%

### **INVESTIMENTO ESTIMADO:**

- **Desenvolvimento iOS:** R$ 150k - R$ 200k
- **Backend adaptações:** R$ 50k - R$ 80k
- **Design/UX:** R$ 30k - R$ 50k
- **Marketing/ASO:** R$ 20k - R$ 40k
- **Total:** R$ 250k - R$ 370k

**ROI Esperado:** 300-500% em 18 meses
