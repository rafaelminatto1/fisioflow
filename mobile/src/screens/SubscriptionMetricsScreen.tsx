import React, { useState, useEffect } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, Alert } from 'react-native';
import { 
  Card, 
  Title, 
  Paragraph, 
  Button, 
  SegmentedButtons, 
  useTheme, 
  Text,
  Surface,
  Chip,
  ProgressBar
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  DEMO_METRIC_CARDS, 
  DEMO_CONVERSION_FUNNEL, 
  DEMO_REVENUE_TREND, 
  DEMO_PLAN_DISTRIBUTION,
  simulateApiDelay 
} from '../services/demoData';
import { MetricCard, ConversionFunnelData, RevenueData, PlanDistribution } from '../types';

export default function SubscriptionMetricsScreen() {
  const [selectedPeriod, setSelectedPeriod] = useState('30d');
  const [refreshing, setRefreshing] = useState(false);
  const [loading, setLoading] = useState(true);
  const [metrics, setMetrics] = useState<MetricCard[]>([]);
  const [conversionFunnel, setConversionFunnel] = useState<ConversionFunnelData[]>([]);
  const [revenueTrend, setRevenueTrend] = useState<RevenueData[]>([]);
  const [planDistribution, setPlanDistribution] = useState<PlanDistribution[]>([]);
  const theme = useTheme();

  useEffect(() => {
    loadMetricsData();
  }, [selectedPeriod]);

  const loadMetricsData = async () => {
    try {
      setLoading(true);
      await simulateApiDelay(1000);
      
      // Load demo data
      setMetrics(DEMO_METRIC_CARDS);
      setConversionFunnel(DEMO_CONVERSION_FUNNEL);
      setRevenueTrend(DEMO_REVENUE_TREND);
      setPlanDistribution(DEMO_PLAN_DISTRIBUTION);
    } catch (error) {
      Alert.alert('Erro', 'Falha ao carregar métricas');
    } finally {
      setLoading(false);
    }
  };

  const onRefresh = async () => {
    setRefreshing(true);
    await loadMetricsData();
    setRefreshing(false);
  };

  const exportData = () => {
    Alert.alert(
      'Exportar Dados',
      'Funcionalidade de exportação será implementada em breve.',
      [{ text: 'OK' }]
    );
  };

  const getChangeColor = (changeType: string) => {
    switch (changeType) {
      case 'increase': return '#10b981';
      case 'decrease': return '#ef4444';
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const getPlanColor = (plan: string) => {
    switch (plan) {
      case 'silver': return '#3b82f6';
      case 'gold': return '#f59e0b';
      case 'platinum': return '#8b5cf6';
      default: return theme.colors.onSurfaceVariant;
    }
  };

  const getPlanLabel = (plan: string) => {
    switch (plan) {
      case 'free': return 'Gratuito';
      case 'silver': return 'Silver';
      case 'gold': return 'Gold';
      case 'platinum': return 'Platinum';
      default: return plan;
    }
  };

  if (loading) {
    return (
      <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
        <View style={styles.loadingContainer}>
          <Text style={{ color: theme.colors.onBackground }}>Carregando métricas...</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        style={styles.scrollView}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        {/* Header */}
        <Card style={[styles.headerCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.headerTitle, { color: theme.colors.onSurface }]}>
              📊 Métricas de Assinatura
            </Title>
            <Paragraph style={[styles.headerSubtitle, { color: theme.colors.onSurfaceVariant }]}>
              Dashboard administrativo para monitoramento de conversões
            </Paragraph>
          </Card.Content>
        </Card>

        {/* Period Filter */}
        <Card style={[styles.filterCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Text style={[styles.filterLabel, { color: theme.colors.onSurface }]}>
              Período de Análise
            </Text>
            <SegmentedButtons
              value={selectedPeriod}
              onValueChange={setSelectedPeriod}
              buttons={[
                { value: '7d', label: '7d' },
                { value: '30d', label: '30d' },
                { value: '90d', label: '90d' },
                { value: '1y', label: '1a' },
              ]}
              style={styles.segmentedButtons}
            />
          </Card.Content>
        </Card>

        {/* Key Metrics */}
        <View style={styles.metricsGrid}>
          {metrics.map((metric, index) => (
            <Card key={index} style={[styles.metricCard, { backgroundColor: theme.colors.surface }]}>
              <Card.Content style={styles.metricContent}>
                <Title style={[styles.metricValue, { color: theme.colors.onSurface }]}>
                  {metric.value}
                </Title>
                <Paragraph style={[styles.metricTitle, { color: theme.colors.onSurfaceVariant }]}>
                  {metric.title}
                </Paragraph>
                <View style={styles.metricChange}>
                  <Text style={[
                    styles.changeText,
                    { color: getChangeColor(metric.changeType) }
                  ]}>
                    {metric.change > 0 ? '+' : ''}{metric.change}
                    {metric.changeType !== 'neutral' && (
                      metric.changeType === 'increase' ? ' ↗️' : ' ↘️'
                    )}
                  </Text>
                </View>
                {metric.description && (
                  <Paragraph style={[styles.metricDescription, { color: theme.colors.onSurfaceVariant }]}>
                    {metric.description}
                  </Paragraph>
                )}
              </Card.Content>
            </Card>
          ))}
        </View>

        {/* Conversion Funnel */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
              📈 Funil de Conversão
            </Title>
            
            {conversionFunnel.map((stage, index) => (
              <View key={index} style={styles.funnelStage}>
                <View style={styles.funnelHeader}>
                  <Text style={[styles.funnelStageTitle, { color: theme.colors.onSurface }]}>
                    {stage.stage}
                  </Text>
                  <View style={styles.funnelStats}>
                    <Text style={[styles.funnelUsers, { color: theme.colors.onSurface }]}>
                      {stage.users.toLocaleString()}
                    </Text>
                    <Text style={[styles.funnelRate, { color: theme.colors.onSurfaceVariant }]}>
                      ({stage.conversionRate.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  progress={stage.conversionRate / 100}
                  color={theme.colors.primary}
                  style={styles.funnelProgress}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Plan Distribution */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
              🥧 Distribuição de Planos
            </Title>
            
            {planDistribution.map((item, index) => (
              <View key={index} style={styles.planItem}>
                <View style={styles.planHeader}>
                  <Chip
                    icon="circle"
                    style={[styles.planChip, { backgroundColor: `${getPlanColor(item.plan)}20` }]}
                    textStyle={{ color: getPlanColor(item.plan) }}
                  >
                    {getPlanLabel(item.plan)}
                  </Chip>
                  <View style={styles.planStats}>
                    <Text style={[styles.planCount, { color: theme.colors.onSurface }]}>
                      {item.count}
                    </Text>
                    <Text style={[styles.planPercentage, { color: theme.colors.onSurfaceVariant }]}>
                      ({item.percentage.toFixed(1)}%)
                    </Text>
                  </View>
                </View>
                <ProgressBar
                  progress={item.percentage / 100}
                  color={getPlanColor(item.plan)}
                  style={styles.planProgress}
                />
              </View>
            ))}
          </Card.Content>
        </Card>

        {/* Revenue Trend */}
        <Card style={[styles.chartCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Title style={[styles.chartTitle, { color: theme.colors.onSurface }]}>
              💰 Tendência de Receita
            </Title>
            
            {revenueTrend.map((data, index) => (
              <Surface key={index} style={[styles.revenueItem, { backgroundColor: theme.colors.surfaceVariant }]}>
                <View style={styles.revenueHeader}>
                  <Text style={[styles.revenuePeriod, { color: theme.colors.onSurfaceVariant }]}>
                    📅 {data.period}
                  </Text>
                </View>
                <View style={styles.revenueStats}>
                  <View style={styles.revenueStat}>
                    <Text style={[styles.revenueValue, { color: theme.colors.primary }]}>
                      R$ {data.revenue.toLocaleString('pt-BR', { maximumFractionDigits: 0 })}
                    </Text>
                    <Text style={[styles.revenueLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Receita
                    </Text>
                  </View>
                  <View style={styles.revenueStat}>
                    <Text style={[styles.revenueValue, { color: theme.colors.secondary }]}>
                      {data.subscriptions}
                    </Text>
                    <Text style={[styles.revenueLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Assinaturas
                    </Text>
                  </View>
                  <View style={styles.revenueStat}>
                    <Text style={[styles.revenueValue, { color: '#ef4444' }]}>
                      {data.churn.toFixed(1)}%
                    </Text>
                    <Text style={[styles.revenueLabel, { color: theme.colors.onSurfaceVariant }]}>
                      Churn
                    </Text>
                  </View>
                </View>
              </Surface>
            ))}
          </Card.Content>
        </Card>

        {/* Export Button */}
        <Card style={[styles.exportCard, { backgroundColor: theme.colors.surface }]}>
          <Card.Content>
            <Button
              mode="contained"
              icon="download"
              onPress={exportData}
              contentStyle={styles.exportButtonContent}
            >
              Exportar Dados
            </Button>
          </Card.Content>
        </Card>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
    padding: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCard: {
    marginBottom: 16,
    elevation: 2,
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  headerSubtitle: {
    fontSize: 14,
  },
  filterCard: {
    marginBottom: 16,
    elevation: 2,
  },
  filterLabel: {
    fontSize: 16,
    fontWeight: '500',
    marginBottom: 12,
  },
  segmentedButtons: {
    marginBottom: 8,
  },
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 16,
  },
  metricCard: {
    width: '48%',
    marginBottom: 12,
    elevation: 2,
  },
  metricContent: {
    alignItems: 'center',
    paddingVertical: 16,
  },
  metricValue: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  metricTitle: {
    fontSize: 12,
    textAlign: 'center',
    marginBottom: 8,
  },
  metricChange: {
    marginBottom: 8,
  },
  changeText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  metricDescription: {
    fontSize: 10,
    textAlign: 'center',
  },
  chartCard: {
    marginBottom: 16,
    elevation: 2,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  funnelStage: {
    marginBottom: 16,
  },
  funnelHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  funnelStageTitle: {
    fontSize: 14,
    fontWeight: '500',
  },
  funnelStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  funnelUsers: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  funnelRate: {
    fontSize: 12,
  },
  funnelProgress: {
    height: 8,
    borderRadius: 4,
  },
  planItem: {
    marginBottom: 16,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  planChip: {
    alignSelf: 'flex-start',
  },
  planStats: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  planCount: {
    fontSize: 14,
    fontWeight: 'bold',
    marginRight: 8,
  },
  planPercentage: {
    fontSize: 12,
  },
  planProgress: {
    height: 6,
    borderRadius: 3,
  },
  revenueItem: {
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    elevation: 1,
  },
  revenueHeader: {
    marginBottom: 12,
  },
  revenuePeriod: {
    fontSize: 14,
    fontWeight: '500',
  },
  revenueStats: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  revenueStat: {
    alignItems: 'center',
  },
  revenueValue: {
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 4,
  },
  revenueLabel: {
    fontSize: 12,
  },
  exportCard: {
    marginBottom: 32,
    elevation: 2,
  },
  exportButtonContent: {
    paddingVertical: 8,
  },
});