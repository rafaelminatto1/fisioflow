/**
 * Marketplace de Exercícios e Protocolos
 * Plataforma para compartilhamento, compra e venda de conteúdo clínico
 */

import { auditLogger, AuditAction, LegalBasis } from './auditLogger';
import { encryption } from './encryption';
import { intelligentNotificationService } from './intelligentNotificationService';

// === INTERFACES ===
interface MarketplaceItem {
  id: string;
  
  // Informações básicas
  title: string;
  description: string;
  category: 'exercise' | 'protocol' | 'course' | 'template' | 'assessment_tool';
  subcategory: string; // 'orthopedic', 'neurological', 'pediatric', etc.
  
  // Conteúdo
  content: MarketplaceContent;
  
  // Autor/Criador
  authorId: string;
  authorName: string;
  authorCredentials?: string;
  authorRating: number; // 1-5
  
  // Preço e modelo de negócio
  pricing: {
    model: 'free' | 'one_time' | 'subscription' | 'usage_based';
    price: number; // em centavos
    currency: 'BRL' | 'USD' | 'EUR';
    discountPercentage?: number;
    originalPrice?: number;
  };
  
  // Avaliações e métricas
  rating: number; // 1-5
  totalRatings: number;
  downloadCount: number;
  favoriteCount: number;
  
  // Tags e busca
  tags: string[];
  keywords: string[];
  targetAudience: string[]; // 'physiotherapist', 'patient', 'student'
  difficulty: 'beginner' | 'intermediate' | 'advanced' | 'expert';
  
  // Compatibilidade
  supportedLanguages: string[];
  requiredFeatures?: string[]; // Features necessárias no app
  compatibility: {
    mobile: boolean;
    tablet: boolean;
    desktop: boolean;
    vr: boolean;
  };
  
  // Conteúdo médico
  evidenceLevel?: 'A' | 'B' | 'C' | 'D'; // Nível de evidência científica
  references?: string[]; // Bibliografia
  contraindications?: string[];
  precautions?: string[];
  
  // Status e moderação
  status: 'draft' | 'pending_review' | 'approved' | 'rejected' | 'suspended';
  moderationNotes?: string;
  
  // Metadados
  version: string;
  lastUpdated: string;
  createdAt: string;
  publishedAt?: string;
  
  // Analytics
  views: number;
  uniqueViews: number;
  conversionRate: number; // %
  
  tenantId?: string; // null para items globais
}

interface MarketplaceContent {
  // Mídia principal
  mainMedia: {
    type: 'video' | 'image' | 'animation' | 'pdf' | 'interactive';
    url: string;
    duration?: number; // para vídeos, em segundos
    thumbnailUrl: string;
    size: number; // bytes
  };
  
  // Arquivos adicionais
  additionalFiles: Array<{
    name: string;
    type: string;
    url: string;
    description?: string;
    size: number;
  }>;
  
  // Conteúdo estruturado
  instructions?: Array<{
    step: number;
    title: string;
    description: string;
    duration?: number;
    imageUrl?: string;
    videoUrl?: string;
  }>;
  
  // Parâmetros de exercício
  exerciseParams?: {
    sets?: number;
    repetitions?: number;
    duration?: number; // segundos
    intensity?: 'low' | 'medium' | 'high';
    equipment?: string[];
    muscleGroups?: string[];
    movementPattern?: string;
  };
  
  // Protocolo clínico
  protocolSteps?: Array<{
    phase: string;
    week: number;
    exercises: string[]; // IDs de exercícios
    goals: string[];
    progressionCriteria: string[];
  }>;
  
  // Avaliação
  assessmentCriteria?: Array<{
    parameter: string;
    scale: string;
    normalRange: string;
    interpretation: string;
  }>;
  
  // Conteúdo interativo
  interactiveElements?: Array<{
    type: 'quiz' | 'simulation' | 'ar_guide' | 'biofeedback';
    config: Record<string, any>;
  }>;
}

interface MarketplacePurchase {
  id: string;
  
  // Transação
  itemId: string;
  buyerId: string;
  sellerId: string;
  
  // Valores
  amount: number; // centavos
  currency: string;
  taxes: number;
  fees: number; // taxa do marketplace
  netAmount: number; // valor líquido para o vendedor
  
  // Status
  status: 'pending' | 'completed' | 'cancelled' | 'refunded';
  paymentMethod: string;
  paymentId?: string; // ID do pagamento no gateway
  
  // Licença
  license: {
    type: 'personal' | 'clinic' | 'enterprise';
    usageLimit?: number;
    expiresAt?: string;
    features: string[];
  };
  
  // Metadados
  purchasedAt: string;
  refundedAt?: string;
  refundReason?: string;
  
  tenantId: string;
}

interface MarketplaceReview {
  id: string;
  
  // Item e revisor
  itemId: string;
  reviewerId: string;
  reviewerName: string;
  
  // Avaliação
  rating: number; // 1-5
  title?: string;
  comment?: string;
  
  // Critérios específicos
  criteria: {
    accuracy: number; // 1-5
    usefulness: number; // 1-5
    easeOfUse: number; // 1-5
    valueForMoney: number; // 1-5
    visualQuality: number; // 1-5
  };
  
  // Contexto
  experienceLevel: 'student' | 'junior' | 'experienced' | 'expert';
  usageContext: 'clinical_practice' | 'education' | 'research' | 'personal';
  
  // Moderação
  isVerified: boolean; // comprou o item
  isModerated: boolean;
  isFlagged: boolean;
  flagReason?: string;
  
  // Interação
  helpfulCount: number;
  reportCount: number;
  
  // Metadados
  createdAt: string;
  updatedAt: string;
  
  tenantId: string;
}

interface ContentCreator {
  id: string;
  
  // Perfil
  name: string;
  bio: string;
  credentials: string[];
  specialties: string[];
  
  // Imagens
  avatarUrl?: string;
  bannerUrl?: string;
  
  // Estatísticas
  totalItems: number;
  totalSales: number;
  totalRevenue: number;
  averageRating: number;
  followerCount: number;
  
  // Verificação
  isVerified: boolean;
  verificationBadges: string[]; // 'expert', 'certified', 'university'
  
  // Social
  socialLinks: {
    website?: string;
    linkedin?: string;
    youtube?: string;
    instagram?: string;
  };
  
  // Configurações
  commissionRate: number; // % que fica para o marketplace
  payoutSchedule: 'weekly' | 'monthly';
  payoutMethod: 'pix' | 'bank_transfer' | 'paypal';
  
  // Status
  isActive: boolean;
  joinedAt: string;
  lastActiveAt: string;
  
  tenantId?: string;
}

interface MarketplaceCategory {
  id: string;
  name: string;
  description: string;
  parentId?: string;
  
  // Configuração
  iconUrl: string;
  color: string;
  featured: boolean;
  order: number;
  
  // Metadados
  itemCount: number;
  
  // Filtros específicos da categoria
  availableFilters: Array<{
    key: string;
    name: string;
    type: 'select' | 'range' | 'checkbox';
    options?: string[];
  }>;
}

interface MarketplaceSearch {
  query?: string;
  category?: string;
  subcategory?: string;
  tags?: string[];
  priceRange?: { min: number; max: number };
  rating?: number;
  difficulty?: string;
  evidenceLevel?: string;
  freeOnly?: boolean;
  
  // Ordenação
  sortBy: 'relevance' | 'popularity' | 'rating' | 'price_asc' | 'price_desc' | 'newest' | 'oldest';
  
  // Paginação
  page: number;
  limit: number;
}

// === CLASSE PRINCIPAL ===
class MarketplaceService {
  private items: Map<string, MarketplaceItem> = new Map();
  private purchases: Map<string, MarketplacePurchase> = new Map();
  private reviews: Map<string, MarketplaceReview> = new Map();
  private creators: Map<string, ContentCreator> = new Map();
  private categories: Map<string, MarketplaceCategory> = new Map();

  constructor() {
    this.initialize();
  }

  /**
   * Inicializar o marketplace
   */
  async initialize(): Promise<void> {
    await this.loadStoredData();
    this.setupDefaultCategories();
    this.startAnalyticsLoop();
    
    console.log('🏪 Marketplace Service inicializado');
  }

  // === GESTÃO DE ITENS ===

  /**
   * Publicar novo item no marketplace
   */
  async publishItem(
    item: Omit<MarketplaceItem, 'id' | 'rating' | 'totalRatings' | 'downloadCount' | 'favoriteCount' | 'views' | 'uniqueViews' | 'conversionRate' | 'createdAt' | 'lastUpdated' | 'version'>,
    creatorId: string,
    tenantId: string
  ): Promise<string> {
    const itemId = this.generateId('item');
    
    const fullItem: MarketplaceItem = {
      ...item,
      id: itemId,
      rating: 0,
      totalRatings: 0,
      downloadCount: 0,
      favoriteCount: 0,
      views: 0,
      uniqueViews: 0,
      conversionRate: 0,
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      tenantId: item.tenantId || null, // Itens globais têm tenantId null
    };

    this.items.set(itemId, fullItem);
    await this.saveItems();

    // Atualizar estatísticas do criador
    await this.updateCreatorStats(creatorId);

    // Notificar moderadores se necessário
    if (fullItem.status === 'pending_review') {
      await this.notifyModerators(fullItem);
    }

    // Log de auditoria
    await auditLogger.logAction(
      tenantId,
      creatorId,
      'USER',
      AuditAction.CREATE,
      'marketplace_item',
      itemId,
      {
        entityName: item.title,
        legalBasis: LegalBasis.LEGITIMATE_INTEREST,
        dataAccessed: ['content_data'],
        metadata: {
          category: item.category,
          pricing: item.pricing.model,
          status: item.status,
        },
      }
    );

    console.log(`🏪 Item publicado no marketplace: ${item.title}`);
    return itemId;
  }

  /**
   * Buscar itens no marketplace
   */
  async searchItems(
    search: MarketplaceSearch,
    userId?: string,
    tenantId?: string
  ): Promise<{
    items: MarketplaceItem[];
    total: number;
    page: number;
    totalPages: number;
    facets: Record<string, Array<{ value: string; count: number }>>;
  }> {
    let filteredItems = Array.from(this.items.values())
      .filter(item => item.status === 'approved');

    // Aplicar filtros
    if (search.query) {
      const query = search.query.toLowerCase();
      filteredItems = filteredItems.filter(item => 
        item.title.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query) ||
        item.tags.some(tag => tag.toLowerCase().includes(query)) ||
        item.keywords.some(keyword => keyword.toLowerCase().includes(query))
      );
    }

    if (search.category) {
      filteredItems = filteredItems.filter(item => item.category === search.category);
    }

    if (search.subcategory) {
      filteredItems = filteredItems.filter(item => item.subcategory === search.subcategory);
    }

    if (search.tags && search.tags.length > 0) {
      filteredItems = filteredItems.filter(item => 
        search.tags!.some(tag => item.tags.includes(tag))
      );
    }

    if (search.priceRange) {
      filteredItems = filteredItems.filter(item => {
        const price = item.pricing.price / 100; // converter de centavos
        return price >= search.priceRange!.min && price <= search.priceRange!.max;
      });
    }

    if (search.rating) {
      filteredItems = filteredItems.filter(item => item.rating >= search.rating!);
    }

    if (search.difficulty) {
      filteredItems = filteredItems.filter(item => item.difficulty === search.difficulty);
    }

    if (search.evidenceLevel) {
      filteredItems = filteredItems.filter(item => item.evidenceLevel === search.evidenceLevel);
    }

    if (search.freeOnly) {
      filteredItems = filteredItems.filter(item => item.pricing.model === 'free');
    }

    // Ordenar resultados
    filteredItems.sort((a, b) => {
      switch (search.sortBy) {
        case 'popularity':
          return b.downloadCount - a.downloadCount;
        case 'rating':
          return b.rating - a.rating;
        case 'price_asc':
          return a.pricing.price - b.pricing.price;
        case 'price_desc':
          return b.pricing.price - a.pricing.price;
        case 'newest':
          return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        case 'oldest':
          return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        default: // relevance
          return b.views - a.views;
      }
    });

    // Paginação
    const total = filteredItems.length;
    const totalPages = Math.ceil(total / search.limit);
    const startIndex = (search.page - 1) * search.limit;
    const paginatedItems = filteredItems.slice(startIndex, startIndex + search.limit);

    // Gerar facets para filtros
    const facets = this.generateFacets(filteredItems);

    // Registrar views dos itens mostrados
    for (const item of paginatedItems) {
      item.views++;
      if (userId) {
        // Em produção, manteria lista de usuários únicos
        item.uniqueViews++;
      }
    }

    await this.saveItems();

    return {
      items: paginatedItems,
      total,
      page: search.page,
      totalPages,
      facets,
    };
  }

  /**
   * Comprar item do marketplace
   */
  async purchaseItem(
    itemId: string,
    buyerId: string,
    licenseType: 'personal' | 'clinic' | 'enterprise',
    paymentMethod: string,
    tenantId: string
  ): Promise<{
    purchase: MarketplacePurchase;
    paymentUrl?: string;
  }> {
    const item = this.items.get(itemId);
    if (!item || item.status !== 'approved') {
      throw new Error('Item não encontrado ou não disponível');
    }

    // Verificar se já possui o item
    const existingPurchase = Array.from(this.purchases.values())
      .find(p => p.itemId === itemId && p.buyerId === buyerId && p.status === 'completed');
    
    if (existingPurchase) {
      throw new Error('Item já foi adquirido');
    }

    const purchaseId = this.generateId('purchase');
    
    // Calcular valores
    const baseAmount = item.pricing.price;
    const taxes = Math.floor(baseAmount * 0.05); // 5% de impostos
    const fees = Math.floor(baseAmount * 0.05); // 5% de taxa do marketplace
    const amount = baseAmount + taxes;
    const netAmount = baseAmount - fees;

    // Determinar recursos da licença
    const licenseFeatures = this.getLicenseFeatures(licenseType, item);

    const purchase: MarketplacePurchase = {
      id: purchaseId,
      itemId,
      buyerId,
      sellerId: item.authorId,
      amount,
      currency: item.pricing.currency,
      taxes,
      fees,
      netAmount,
      status: 'pending',
      paymentMethod,
      license: {
        type: licenseType,
        features: licenseFeatures,
        ...(licenseType === 'personal' && { usageLimit: 1 }),
        ...(licenseType === 'clinic' && { usageLimit: 10 }),
        // Enterprise não tem limite
      },
      purchasedAt: new Date().toISOString(),
      tenantId,
    };

    this.purchases.set(purchaseId, purchase);
    await this.savePurchases();

    // Simular integração com gateway de pagamento
    const paymentUrl = await this.createPaymentIntent(purchase);

    // Log de auditoria
    await auditLogger.logAction(
      tenantId,
      buyerId,
      'USER',
      AuditAction.CREATE,
      'marketplace_purchase',
      purchaseId,
      {
        entityName: `Purchase: ${item.title}`,
        legalBasis: LegalBasis.CONTRACT,
        dataAccessed: ['payment_data', 'license_info'],
        metadata: {
          itemId,
          amount: amount / 100,
          currency: item.pricing.currency,
          licenseType,
        },
      }
    );

    console.log(`💳 Compra iniciada: ${item.title} (${amount / 100} ${item.pricing.currency})`);
    return { purchase, paymentUrl };
  }

  /**
   * Confirmar pagamento
   */
  async confirmPayment(
    purchaseId: string,
    paymentId: string,
    tenantId: string
  ): Promise<void> {
    const purchase = this.purchases.get(purchaseId);
    if (!purchase || purchase.tenantId !== tenantId) {
      throw new Error('Compra não encontrada');
    }

    const item = this.items.get(purchase.itemId);
    if (!item) {
      throw new Error('Item não encontrado');
    }

    // Atualizar compra
    purchase.status = 'completed';
    purchase.paymentId = paymentId;

    // Atualizar estatísticas do item
    item.downloadCount++;
    item.conversionRate = (item.downloadCount / item.views) * 100;

    // Atualizar estatísticas do criador
    await this.updateCreatorStats(item.authorId);

    await this.savePurchases();
    await this.saveItems();

    // Notificar comprador
    await intelligentNotificationService.sendNotification(
      purchase.buyerId,
      'user',
      {
        title: 'Compra Confirmada',
        message: `Sua compra de "${item.title}" foi confirmada. O conteúdo já está disponível.`,
        category: 'purchase',
        priority: 'medium',
        data: { purchaseId, itemId: item.id },
      },
      tenantId
    );

    // Notificar vendedor
    await intelligentNotificationService.sendNotification(
      item.authorId,
      'user',
      {
        title: 'Nova Venda',
        message: `Seu item "${item.title}" foi vendido! Você receberá ${purchase.netAmount / 100} ${purchase.currency}.`,
        category: 'sale',
        priority: 'medium',
        data: { purchaseId, itemId: item.id },
      },
      tenantId
    );

    console.log(`✅ Pagamento confirmado: ${purchaseId}`);
  }

  // === AVALIAÇÕES ===

  /**
   * Adicionar avaliação
   */
  async addReview(
    review: Omit<MarketplaceReview, 'id' | 'isVerified' | 'isModerated' | 'isFlagged' | 'helpfulCount' | 'reportCount' | 'createdAt' | 'updatedAt'>,
    tenantId: string
  ): Promise<string> {
    // Verificar se o usuário comprou o item
    const hasPurchased = Array.from(this.purchases.values())
      .some(p => p.itemId === review.itemId && p.buyerId === review.reviewerId && p.status === 'completed');

    const reviewId = this.generateId('review');
    
    const fullReview: MarketplaceReview = {
      ...review,
      id: reviewId,
      isVerified: hasPurchased,
      isModerated: false,
      isFlagged: false,
      helpfulCount: 0,
      reportCount: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tenantId,
    };

    this.reviews.set(reviewId, fullReview);
    await this.saveReviews();

    // Atualizar rating do item
    await this.updateItemRating(review.itemId);

    console.log(`⭐ Avaliação adicionada para item ${review.itemId}: ${review.rating} estrelas`);
    return reviewId;
  }

  // === GESTÃO DE CRIADORES ===

  /**
   * Registrar criador de conteúdo
   */
  async registerContentCreator(
    creator: Omit<ContentCreator, 'id' | 'totalItems' | 'totalSales' | 'totalRevenue' | 'averageRating' | 'followerCount' | 'isActive' | 'joinedAt' | 'lastActiveAt'>,
    tenantId: string
  ): Promise<string> {
    const creatorId = this.generateId('creator');
    
    const fullCreator: ContentCreator = {
      ...creator,
      id: creatorId,
      totalItems: 0,
      totalSales: 0,
      totalRevenue: 0,
      averageRating: 0,
      followerCount: 0,
      isActive: true,
      joinedAt: new Date().toISOString(),
      lastActiveAt: new Date().toISOString(),
      tenantId,
    };

    this.creators.set(creatorId, fullCreator);
    await this.saveCreators();

    console.log(`👨‍💼 Criador de conteúdo registrado: ${creator.name}`);
    return creatorId;
  }

  // === MÉTODOS PRIVADOS ===

  private generateFacets(items: MarketplaceItem[]): Record<string, Array<{ value: string; count: number }>> {
    const facets: Record<string, Map<string, number>> = {
      category: new Map(),
      subcategory: new Map(),
      difficulty: new Map(),
      evidenceLevel: new Map(),
      tags: new Map(),
    };

    // Contar valores
    items.forEach(item => {
      facets.category.set(item.category, (facets.category.get(item.category) || 0) + 1);
      facets.subcategory.set(item.subcategory, (facets.subcategory.get(item.subcategory) || 0) + 1);
      facets.difficulty.set(item.difficulty, (facets.difficulty.get(item.difficulty) || 0) + 1);
      
      if (item.evidenceLevel) {
        facets.evidenceLevel.set(item.evidenceLevel, (facets.evidenceLevel.get(item.evidenceLevel) || 0) + 1);
      }
      
      item.tags.forEach(tag => {
        facets.tags.set(tag, (facets.tags.get(tag) || 0) + 1);
      });
    });

    // Converter para formato de resposta
    const result: Record<string, Array<{ value: string; count: number }>> = {};
    
    Object.keys(facets).forEach(key => {
      result[key] = Array.from(facets[key].entries())
        .map(([value, count]) => ({ value, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 10); // Top 10 por facet
    });

    return result;
  }

  private getLicenseFeatures(licenseType: string, item: MarketplaceItem): string[] {
    const baseFeatures = ['download', 'offline_access'];
    
    switch (licenseType) {
      case 'personal':
        return [...baseFeatures, 'personal_use'];
      case 'clinic':
        return [...baseFeatures, 'clinic_use', 'multiple_therapists'];
      case 'enterprise':
        return [...baseFeatures, 'unlimited_use', 'white_label', 'api_access'];
      default:
        return baseFeatures;
    }
  }

  private async createPaymentIntent(purchase: MarketplacePurchase): Promise<string> {
    // Simular criação de intent de pagamento
    // Em produção, integraria com Stripe, PagSeguro, etc.
    
    const paymentUrl = `https://checkout.fisioflow.com/pay/${purchase.id}`;
    console.log(`💳 Intent de pagamento criado: ${paymentUrl}`);
    
    return paymentUrl;
  }

  private async updateItemRating(itemId: string): Promise<void> {
    const item = this.items.get(itemId);
    if (!item) return;

    const itemReviews = Array.from(this.reviews.values())
      .filter(r => r.itemId === itemId);

    if (itemReviews.length === 0) return;

    const totalRating = itemReviews.reduce((sum, review) => sum + review.rating, 0);
    const averageRating = totalRating / itemReviews.length;

    item.rating = Math.round(averageRating * 10) / 10; // 1 casa decimal
    item.totalRatings = itemReviews.length;

    await this.saveItems();
  }

  private async updateCreatorStats(creatorId: string): Promise<void> {
    const creator = this.creators.get(creatorId);
    if (!creator) return;

    // Atualizar itens totais
    creator.totalItems = Array.from(this.items.values())
      .filter(item => item.authorId === creatorId && item.status === 'approved').length;

    // Atualizar vendas e receita
    const creatorPurchases = Array.from(this.purchases.values())
      .filter(p => p.sellerId === creatorId && p.status === 'completed');

    creator.totalSales = creatorPurchases.length;
    creator.totalRevenue = creatorPurchases.reduce((sum, p) => sum + p.netAmount, 0);

    // Atualizar rating médio
    const creatorItems = Array.from(this.items.values())
      .filter(item => item.authorId === creatorId && item.totalRatings > 0);

    if (creatorItems.length > 0) {
      const totalRating = creatorItems.reduce((sum, item) => sum + (item.rating * item.totalRatings), 0);
      const totalRatings = creatorItems.reduce((sum, item) => sum + item.totalRatings, 0);
      creator.averageRating = totalRating / totalRatings;
    }

    creator.lastActiveAt = new Date().toISOString();
    await this.saveCreators();
  }

  private async notifyModerators(item: MarketplaceItem): Promise<void> {
    // Em produção, notificaria moderadores reais
    console.log(`🔍 Item pendente de moderação: ${item.title}`);
  }

  private setupDefaultCategories(): void {
    const defaultCategories: MarketplaceCategory[] = [
      {
        id: 'exercises',
        name: 'Exercícios',
        description: 'Exercícios terapêuticos e de reabilitação',
        iconUrl: '/icons/exercise.svg',
        color: '#3B82F6',
        featured: true,
        order: 1,
        itemCount: 0,
        availableFilters: [
          {
            key: 'muscle_group',
            name: 'Grupo Muscular',
            type: 'checkbox',
            options: ['Core', 'Upper Limb', 'Lower Limb', 'Spine'],
          },
          {
            key: 'equipment',
            name: 'Equipamento',
            type: 'checkbox',
            options: ['None', 'Resistance Band', 'Ball', 'Weights'],
          },
        ],
      },
      {
        id: 'protocols',
        name: 'Protocolos',
        description: 'Protocolos clínicos e guias de tratamento',
        iconUrl: '/icons/protocol.svg',
        color: '#10B981',
        featured: true,
        order: 2,
        itemCount: 0,
        availableFilters: [
          {
            key: 'specialty',
            name: 'Especialidade',
            type: 'select',
            options: ['Orthopedic', 'Neurological', 'Pediatric', 'Geriatric'],
          },
          {
            key: 'duration',
            name: 'Duração (semanas)',
            type: 'range',
          },
        ],
      },
      {
        id: 'courses',
        name: 'Cursos',
        description: 'Cursos e material educativo',
        iconUrl: '/icons/course.svg',
        color: '#F59E0B',
        featured: true,
        order: 3,
        itemCount: 0,
        availableFilters: [
          {
            key: 'level',
            name: 'Nível',
            type: 'select',
            options: ['Beginner', 'Intermediate', 'Advanced'],
          },
        ],
      },
    ];

    defaultCategories.forEach(category => {
      this.categories.set(category.id, category);
    });

    console.log('📂 Categorias padrão do marketplace configuradas');
  }

  private startAnalyticsLoop(): void {
    // Atualizar analytics a cada hora
    setInterval(() => {
      // Atualizar contadores de itens nas categorias
      for (const category of this.categories.values()) {
        category.itemCount = Array.from(this.items.values())
          .filter(item => item.category === category.id && item.status === 'approved').length;
      }
    }, 60 * 60 * 1000); // 1 hora
  }

  private async loadStoredData(): Promise<void> {
    try {
      // Carregar itens
      const itemsData = localStorage.getItem('fisioflow_marketplace_items');
      if (itemsData) {
        const items = JSON.parse(itemsData);
        items.forEach((item: MarketplaceItem) => {
          this.items.set(item.id, item);
        });
      }

      // Carregar compras
      const purchasesData = localStorage.getItem('fisioflow_marketplace_purchases');
      if (purchasesData) {
        const purchases = JSON.parse(purchasesData);
        purchases.forEach((purchase: MarketplacePurchase) => {
          this.purchases.set(purchase.id, purchase);
        });
      }

      // Carregar avaliações
      const reviewsData = localStorage.getItem('fisioflow_marketplace_reviews');
      if (reviewsData) {
        const reviews = JSON.parse(reviewsData);
        reviews.forEach((review: MarketplaceReview) => {
          this.reviews.set(review.id, review);
        });
      }

      // Carregar criadores
      const creatorsData = localStorage.getItem('fisioflow_marketplace_creators');
      if (creatorsData) {
        const creators = JSON.parse(creatorsData);
        creators.forEach((creator: ContentCreator) => {
          this.creators.set(creator.id, creator);
        });
      }
    } catch (error) {
      console.error('❌ Erro ao carregar dados do marketplace:', error);
    }
  }

  private async saveItems(): Promise<void> {
    try {
      const items = Array.from(this.items.values());
      localStorage.setItem('fisioflow_marketplace_items', JSON.stringify(items));
    } catch (error) {
      console.error('❌ Erro ao salvar itens:', error);
    }
  }

  private async savePurchases(): Promise<void> {
    try {
      const purchases = Array.from(this.purchases.values());
      localStorage.setItem('fisioflow_marketplace_purchases', JSON.stringify(purchases));
    } catch (error) {
      console.error('❌ Erro ao salvar compras:', error);
    }
  }

  private async saveReviews(): Promise<void> {
    try {
      const reviews = Array.from(this.reviews.values());
      localStorage.setItem('fisioflow_marketplace_reviews', JSON.stringify(reviews));
    } catch (error) {
      console.error('❌ Erro ao salvar avaliações:', error);
    }
  }

  private async saveCreators(): Promise<void> {
    try {
      const creators = Array.from(this.creators.values());
      localStorage.setItem('fisioflow_marketplace_creators', JSON.stringify(creators));
    } catch (error) {
      console.error('❌ Erro ao salvar criadores:', error);
    }
  }

  private generateId(prefix: string): string {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }
}

// === INSTÂNCIA SINGLETON ===
export const marketplaceService = new MarketplaceService();

// === HOOKS REACT ===
export const useMarketplace = () => {
  const searchItems = React.useCallback(async (
    search: MarketplaceSearch,
    userId?: string,
    tenantId?: string
  ) => {
    return await marketplaceService.searchItems(search, userId, tenantId);
  }, []);

  const purchaseItem = React.useCallback(async (
    itemId: string,
    buyerId: string,
    licenseType: 'personal' | 'clinic' | 'enterprise',
    paymentMethod: string,
    tenantId: string
  ) => {
    return await marketplaceService.purchaseItem(itemId, buyerId, licenseType, paymentMethod, tenantId);
  }, []);

  return {
    searchItems,
    purchaseItem,
    publishItem: marketplaceService.publishItem.bind(marketplaceService),
    addReview: marketplaceService.addReview.bind(marketplaceService),
    registerCreator: marketplaceService.registerContentCreator.bind(marketplaceService),
    confirmPayment: marketplaceService.confirmPayment.bind(marketplaceService),
  };
};

export default marketplaceService;

// Adicionar import do React
import React from 'react';