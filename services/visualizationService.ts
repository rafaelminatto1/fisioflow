// Data Visualization Service with Chart.js and D3.js Integration

export interface ChartConfig {
  type: 'line' | 'bar' | 'pie' | 'doughnut' | 'scatter' | 'bubble' | 'radar' | 'polar' | 'area';
  data: {
    labels: string[];
    datasets: {
      label: string;
      data: number[];
      backgroundColor?: string | string[];
      borderColor?: string | string[];
      borderWidth?: number;
      fill?: boolean;
      tension?: number;
      pointRadius?: number;
      pointHoverRadius?: number;
    }[];
  };
  options?: {
    responsive?: boolean;
    maintainAspectRatio?: boolean;
    plugins?: {
      legend?: {
        display?: boolean;
        position?: 'top' | 'bottom' | 'left' | 'right';
      };
      title?: {
        display?: boolean;
        text?: string;
      };
      tooltip?: {
        enabled?: boolean;
        mode?: 'index' | 'dataset' | 'point' | 'nearest';
      };
    };
    scales?: {
      x?: {
        display?: boolean;
        title?: {
          display?: boolean;
          text?: string;
        };
      };
      y?: {
        display?: boolean;
        beginAtZero?: boolean;
        title?: {
          display?: boolean;
          text?: string;
        };
      };
    };
    animation?: {
      duration?: number;
      easing?: string;
    };
  };
}

export interface D3Visualization {
  id: string;
  name: string;
  type: 'heatmap' | 'sankey' | 'treemap' | 'network' | 'timeline' | 'calendar' | 'chord' | 'sunburst';
  data: any;
  dimensions: {
    width: number;
    height: number;
    margin?: {
      top: number;
      right: number;
      bottom: number;
      left: number;
    };
  };
  config: {
    colors?: string[];
    interactions?: boolean;
    animations?: boolean;
    tooltip?: boolean;
    legend?: boolean;
    customOptions?: Record<string, any>;
  };
  containerSelector: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardWidget {
  id: string;
  title: string;
  type: 'chart' | 'd3' | 'metric' | 'table' | 'text';
  position: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  config: ChartConfig | D3Visualization | any;
  dataSource: {
    type: 'static' | 'api' | 'service' | 'realtime';
    source: string;
    refreshInterval?: number;
  };
  filters?: {
    dateRange?: {
      start: string;
      end: string;
    };
    categories?: string[];
    customFilters?: Record<string, any>;
  };
  isActive: boolean;
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface Dashboard {
  id: string;
  name: string;
  description: string;
  widgets: string[]; // widget IDs
  layout: {
    columns: number;
    rows: number;
    gridSize: number;
  };
  theme: 'light' | 'dark' | 'auto';
  isPublic: boolean;
  permissions: {
    view: string[];
    edit: string[];
  };
  tenantId: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface VisualizationTemplate {
  id: string;
  name: string;
  description: string;
  category: 'healthcare' | 'business' | 'analytics' | 'financial' | 'operational';
  type: 'chart' | 'd3';
  template: ChartConfig | D3Visualization;
  previewImage?: string;
  tags: string[];
  isBuiltIn: boolean;
  tenantId: string;
  createdBy: string;
  createdAt: string;
}

class VisualizationService {
  private chartInstances: Map<string, any> = new Map();
  private d3Visualizations: D3Visualization[] = [];
  private widgets: DashboardWidget[] = [];
  private dashboards: Dashboard[] = [];
  private templates: VisualizationTemplate[] = [];
  
  // Chart.js and D3.js instances
  private chartJS: any = null;
  private d3: any = null;

  constructor() {
    this.loadStoredData();
    this.initializeLibraries();
    this.createBuiltInTemplates();
  }

  private loadStoredData(): void {
    try {
      const storedVisualizations = localStorage.getItem('d3_visualizations');
      if (storedVisualizations) {
        this.d3Visualizations = JSON.parse(storedVisualizations);
      }

      const storedWidgets = localStorage.getItem('dashboard_widgets');
      if (storedWidgets) {
        this.widgets = JSON.parse(storedWidgets);
      }

      const storedDashboards = localStorage.getItem('dashboards');
      if (storedDashboards) {
        this.dashboards = JSON.parse(storedDashboards);
      }

      const storedTemplates = localStorage.getItem('visualization_templates');
      if (storedTemplates) {
        this.templates = JSON.parse(storedTemplates);
      }
    } catch (error) {
      console.error('Error loading visualization data:', error);
    }
  }

  private saveData(): void {
    try {
      localStorage.setItem('d3_visualizations', JSON.stringify(this.d3Visualizations));
      localStorage.setItem('dashboard_widgets', JSON.stringify(this.widgets));
      localStorage.setItem('dashboards', JSON.stringify(this.dashboards));
      localStorage.setItem('visualization_templates', JSON.stringify(this.templates));
    } catch (error) {
      console.error('Error saving visualization data:', error);
    }
  }

  private async initializeLibraries(): Promise<void> {
    if (typeof window !== 'undefined') {
      try {
        // Initialize Chart.js
        const chartModule = await import('chart.js/auto');
        this.chartJS = chartModule.default;

        // Register Chart.js plugins
        const annotationPlugin = await import('chartjs-plugin-annotation');
        const zoomPlugin = await import('chartjs-plugin-zoom');
        
        this.chartJS.register(annotationPlugin.default, zoomPlugin.default);

        // Initialize D3.js
        this.d3 = await import('d3');

        console.log('Visualization libraries initialized successfully');
      } catch (error) {
        console.error('Error initializing visualization libraries:', error);
      }
    }
  }

  private createBuiltInTemplates(): void {
    if (this.templates.filter(t => t.isBuiltIn).length === 0) {
      const builtInTemplates = [
        {
          name: 'Patient Progress Line Chart',
          description: 'Track patient progress over time',
          category: 'healthcare' as const,
          type: 'chart' as const,
          template: {
            type: 'line' as const,
            data: {
              labels: [],
              datasets: [{
                label: 'Progress Score',
                data: [],
                borderColor: '#4F46E5',
                backgroundColor: 'rgba(79, 70, 229, 0.1)',
                borderWidth: 2,
                fill: true,
                tension: 0.4
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Patient Progress Over Time'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Progress Score'
                  }
                }
              }
            }
          },
          tags: ['patient', 'progress', 'healthcare', 'timeline'],
          isBuiltIn: true
        },
        {
          name: 'Appointment Status Distribution',
          description: 'Show distribution of appointment statuses',
          category: 'healthcare' as const,
          type: 'chart' as const,
          template: {
            type: 'doughnut' as const,
            data: {
              labels: ['Completed', 'Scheduled', 'Cancelled', 'No Show'],
              datasets: [{
                data: [],
                backgroundColor: [
                  '#10B981',
                  '#3B82F6',
                  '#EF4444',
                  '#F59E0B'
                ],
                borderWidth: 0
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Appointment Status Distribution'
                },
                legend: {
                  position: 'bottom' as const
                }
              }
            }
          },
          tags: ['appointments', 'status', 'distribution', 'healthcare'],
          isBuiltIn: true
        },
        {
          name: 'Revenue Monthly Bar Chart',
          description: 'Monthly revenue comparison',
          category: 'business' as const,
          type: 'chart' as const,
          template: {
            type: 'bar' as const,
            data: {
              labels: [],
              datasets: [{
                label: 'Revenue (BRL)',
                data: [],
                backgroundColor: '#059669',
                borderColor: '#047857',
                borderWidth: 1
              }]
            },
            options: {
              responsive: true,
              plugins: {
                title: {
                  display: true,
                  text: 'Monthly Revenue'
                }
              },
              scales: {
                y: {
                  beginAtZero: true,
                  title: {
                    display: true,
                    text: 'Revenue (BRL)'
                  }
                }
              }
            }
          },
          tags: ['revenue', 'financial', 'monthly', 'business'],
          isBuiltIn: true
        },
        {
          name: 'Exercise Completion Heatmap',
          description: 'Patient exercise completion heatmap',
          category: 'healthcare' as const,
          type: 'd3' as const,
          template: {
            id: '',
            name: 'Exercise Completion Heatmap',
            type: 'heatmap' as const,
            data: [],
            dimensions: {
              width: 800,
              height: 400,
              margin: { top: 20, right: 20, bottom: 30, left: 40 }
            },
            config: {
              colors: ['#f7fafc', '#4299e1', '#2b6cb0'],
              interactions: true,
              animations: true,
              tooltip: true,
              legend: true
            },
            containerSelector: '',
            createdAt: '',
            updatedAt: ''
          },
          tags: ['exercise', 'completion', 'heatmap', 'healthcare'],
          isBuiltIn: true
        }
      ];

      builtInTemplates.forEach(template => {
        this.createTemplate(template, 'default', 'system');
      });
    }
  }

  // Chart.js Integration
  async createChart(
    canvasId: string,
    config: ChartConfig,
    containerId?: string
  ): Promise<string> {
    if (!this.chartJS) {
      await this.initializeLibraries();
    }

    try {
      let canvas: HTMLCanvasElement;
      
      if (typeof window !== 'undefined') {
        canvas = document.getElementById(canvasId) as HTMLCanvasElement;
        
        if (!canvas) {
          // Create canvas if it doesn't exist
          canvas = document.createElement('canvas');
          canvas.id = canvasId;
          canvas.width = 400;
          canvas.height = 400;
          
          if (containerId) {
            const container = document.getElementById(containerId);
            if (container) {
              container.appendChild(canvas);
            }
          }
        }

        // Destroy existing chart if it exists
        if (this.chartInstances.has(canvasId)) {
          this.chartInstances.get(canvasId).destroy();
        }

        const ctx = canvas.getContext('2d');
        if (!ctx) {
          throw new Error('Failed to get canvas context');
        }

        const chart = new this.chartJS(ctx, config);
        this.chartInstances.set(canvasId, chart);

        return canvasId;
      }

      throw new Error('Window object not available');
    } catch (error) {
      console.error('Error creating chart:', error);
      throw error;
    }
  }

  updateChart(chartId: string, newData: any): void {
    const chart = this.chartInstances.get(chartId);
    if (!chart) {
      throw new Error(`Chart with ID ${chartId} not found`);
    }

    // Update data
    if (newData.labels) {
      chart.data.labels = newData.labels;
    }
    
    if (newData.datasets) {
      chart.data.datasets = newData.datasets;
    }

    chart.update();
  }

  destroyChart(chartId: string): boolean {
    const chart = this.chartInstances.get(chartId);
    if (chart) {
      chart.destroy();
      this.chartInstances.delete(chartId);
      return true;
    }
    return false;
  }

  // D3.js Integration
  async createD3Visualization(
    containerSelector: string,
    visualization: Omit<D3Visualization, 'id' | 'createdAt' | 'updatedAt'>
  ): Promise<D3Visualization> {
    if (!this.d3) {
      await this.initializeLibraries();
    }

    const viz: D3Visualization = {
      ...visualization,
      id: this.generateId(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    try {
      switch (viz.type) {
        case 'heatmap':
          await this.createHeatmap(viz);
          break;
        case 'treemap':
          await this.createTreemap(viz);
          break;
        case 'network':
          await this.createNetworkGraph(viz);
          break;
        case 'timeline':
          await this.createTimeline(viz);
          break;
        case 'calendar':
          await this.createCalendarView(viz);
          break;
        case 'sunburst':
          await this.createSunburst(viz);
          break;
        default:
          throw new Error(`Unsupported D3 visualization type: ${viz.type}`);
      }

      this.d3Visualizations.push(viz);
      this.saveData();
      return viz;
    } catch (error) {
      console.error('Error creating D3 visualization:', error);
      throw error;
    }
  }

  private async createHeatmap(viz: D3Visualization): Promise<void> {
    const { data, dimensions, config, containerSelector } = viz;
    const { width, height, margin } = dimensions;
    const innerWidth = width - (margin?.left || 0) - (margin?.right || 0);
    const innerHeight = height - (margin?.top || 0) - (margin?.bottom || 0);

    // Clear existing content
    this.d3.select(containerSelector).selectAll('*').remove();

    const svg = this.d3.select(containerSelector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin?.left || 0},${margin?.top || 0})`);

    // Create scales
    const xScale = this.d3.scaleBand()
      .domain(data.map((d: any) => d.x))
      .range([0, innerWidth])
      .padding(0.1);

    const yScale = this.d3.scaleBand()
      .domain(data.map((d: any) => d.y))
      .range([0, innerHeight])
      .padding(0.1);

    const colorScale = this.d3.scaleSequential()
      .interpolator(this.d3.interpolateBlues)
      .domain(this.d3.extent(data, (d: any) => d.value));

    // Create heatmap cells
    g.selectAll('.cell')
      .data(data)
      .enter()
      .append('rect')
      .attr('class', 'cell')
      .attr('x', (d: any) => xScale(d.x))
      .attr('y', (d: any) => yScale(d.y))
      .attr('width', xScale.bandwidth())
      .attr('height', yScale.bandwidth())
      .attr('fill', (d: any) => colorScale(d.value))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(this.d3.axisBottom(xScale));

    g.append('g')
      .call(this.d3.axisLeft(yScale));

    // Add tooltip if enabled
    if (config.tooltip) {
      const tooltip = this.d3.select('body')
        .append('div')
        .attr('class', 'viz-tooltip')
        .style('opacity', 0)
        .style('position', 'absolute')
        .style('background', 'rgba(0,0,0,0.8)')
        .style('color', 'white')
        .style('padding', '8px')
        .style('border-radius', '4px')
        .style('pointer-events', 'none');

      g.selectAll('.cell')
        .on('mouseover', function(event: any, d: any) {
          tooltip.transition()
            .duration(200)
            .style('opacity', .9);
          tooltip.html(`X: ${d.x}<br/>Y: ${d.y}<br/>Value: ${d.value}`)
            .style('left', (event.pageX + 10) + 'px')
            .style('top', (event.pageY - 28) + 'px');
        })
        .on('mouseout', function() {
          tooltip.transition()
            .duration(500)
            .style('opacity', 0);
        });
    }
  }

  private async createTreemap(viz: D3Visualization): Promise<void> {
    const { data, dimensions, config, containerSelector } = viz;
    const { width, height } = dimensions;

    // Clear existing content
    this.d3.select(containerSelector).selectAll('*').remove();

    const svg = this.d3.select(containerSelector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create treemap layout
    const treemap = this.d3.treemap()
      .size([width, height])
      .padding(2);

    const root = this.d3.hierarchy(data)
      .sum((d: any) => d.value)
      .sort((a: any, b: any) => b.value - a.value);

    treemap(root);

    // Create color scale
    const colorScale = this.d3.scaleOrdinal()
      .domain(root.leaves().map((d: any) => d.data.category))
      .range(config.colors || this.d3.schemeCategory10);

    // Create treemap cells
    const leaf = svg.selectAll('g')
      .data(root.leaves())
      .enter()
      .append('g')
      .attr('transform', (d: any) => `translate(${d.x0},${d.y0})`);

    leaf.append('rect')
      .attr('fill', (d: any) => colorScale(d.data.category))
      .attr('stroke', '#fff')
      .attr('width', (d: any) => d.x1 - d.x0)
      .attr('height', (d: any) => d.y1 - d.y0);

    leaf.append('text')
      .attr('x', 4)
      .attr('y', 20)
      .text((d: any) => d.data.name)
      .attr('font-size', '12px')
      .attr('fill', 'white')
      .attr('font-weight', 'bold');

    leaf.append('text')
      .attr('x', 4)
      .attr('y', 35)
      .text((d: any) => d.data.value)
      .attr('font-size', '10px')
      .attr('fill', 'white');
  }

  private async createNetworkGraph(viz: D3Visualization): Promise<void> {
    const { data, dimensions, config, containerSelector } = viz;
    const { width, height } = dimensions;

    // Clear existing content
    this.d3.select(containerSelector).selectAll('*').remove();

    const svg = this.d3.select(containerSelector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Create force simulation
    const simulation = this.d3.forceSimulation(data.nodes)
      .force('link', this.d3.forceLink(data.links).id((d: any) => d.id).distance(100))
      .force('charge', this.d3.forceManyBody().strength(-300))
      .force('center', this.d3.forceCenter(width / 2, height / 2));

    // Create links
    const link = svg.append('g')
      .selectAll('line')
      .data(data.links)
      .enter()
      .append('line')
      .attr('stroke', '#999')
      .attr('stroke-opacity', 0.6)
      .attr('stroke-width', (d: any) => Math.sqrt(d.value || 1));

    // Create nodes
    const node = svg.append('g')
      .selectAll('circle')
      .data(data.nodes)
      .enter()
      .append('circle')
      .attr('r', (d: any) => d.size || 5)
      .attr('fill', (d: any) => d.color || '#69b3a2')
      .call(this.d3.drag()
        .on('start', (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0.3).restart();
          d.fx = d.x;
          d.fy = d.y;
        })
        .on('drag', (event: any, d: any) => {
          d.fx = event.x;
          d.fy = event.y;
        })
        .on('end', (event: any, d: any) => {
          if (!event.active) simulation.alphaTarget(0);
          d.fx = null;
          d.fy = null;
        }));

    // Add labels
    const label = svg.append('g')
      .selectAll('text')
      .data(data.nodes)
      .enter()
      .append('text')
      .text((d: any) => d.name)
      .attr('font-size', '10px')
      .attr('dx', 15)
      .attr('dy', 4);

    // Update positions on simulation tick
    simulation.on('tick', () => {
      link
        .attr('x1', (d: any) => d.source.x)
        .attr('y1', (d: any) => d.source.y)
        .attr('x2', (d: any) => d.target.x)
        .attr('y2', (d: any) => d.target.y);

      node
        .attr('cx', (d: any) => d.x)
        .attr('cy', (d: any) => d.y);

      label
        .attr('x', (d: any) => d.x)
        .attr('y', (d: any) => d.y);
    });
  }

  private async createTimeline(viz: D3Visualization): Promise<void> {
    const { data, dimensions, config, containerSelector } = viz;
    const { width, height, margin } = dimensions;
    const innerWidth = width - (margin?.left || 0) - (margin?.right || 0);
    const innerHeight = height - (margin?.top || 0) - (margin?.bottom || 0);

    // Clear existing content
    this.d3.select(containerSelector).selectAll('*').remove();

    const svg = this.d3.select(containerSelector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${margin?.left || 0},${margin?.top || 0})`);

    // Parse dates and create scales
    const parseDate = this.d3.timeParse('%Y-%m-%d');
    const processedData = data.map((d: any) => ({
      ...d,
      date: parseDate(d.date)
    }));

    const xScale = this.d3.scaleTime()
      .domain(this.d3.extent(processedData, (d: any) => d.date))
      .range([0, innerWidth]);

    const yScale = this.d3.scaleBand()
      .domain(processedData.map((d: any) => d.category))
      .range([0, innerHeight])
      .padding(0.1);

    // Create timeline items
    g.selectAll('.timeline-item')
      .data(processedData)
      .enter()
      .append('rect')
      .attr('class', 'timeline-item')
      .attr('x', (d: any) => xScale(d.date) - 5)
      .attr('y', (d: any) => yScale(d.category))
      .attr('width', 10)
      .attr('height', yScale.bandwidth())
      .attr('fill', (d: any) => d.color || '#4299e1')
      .attr('rx', 2);

    // Add labels
    g.selectAll('.timeline-label')
      .data(processedData)
      .enter()
      .append('text')
      .attr('class', 'timeline-label')
      .attr('x', (d: any) => xScale(d.date) + 15)
      .attr('y', (d: any) => yScale(d.category) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .text((d: any) => d.title)
      .attr('font-size', '12px');

    // Add axes
    g.append('g')
      .attr('transform', `translate(0,${innerHeight})`)
      .call(this.d3.axisBottom(xScale).tickFormat(this.d3.timeFormat('%b %Y')));

    g.append('g')
      .call(this.d3.axisLeft(yScale));
  }

  private async createCalendarView(viz: D3Visualization): Promise<void> {
    const { data, dimensions, config, containerSelector } = viz;
    const { width, height } = dimensions;
    const cellSize = 17;
    const yearHeight = cellSize * 7;

    // Clear existing content
    this.d3.select(containerSelector).selectAll('*').remove();

    const svg = this.d3.select(containerSelector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    // Process data
    const parseDate = this.d3.timeParse('%Y-%m-%d');
    const processedData = new Map(
      data.map((d: any) => [d.date, d.value])
    );

    const colorScale = this.d3.scaleSequential()
      .interpolator(this.d3.interpolateBlues)
      .domain(this.d3.extent(data, (d: any) => d.value));

    const year = new Date().getFullYear();
    const yearData = this.d3.timeDays(
      new Date(year, 0, 1),
      new Date(year + 1, 0, 1)
    );

    const rect = svg.selectAll('.day')
      .data(yearData)
      .enter()
      .append('rect')
      .attr('class', 'day')
      .attr('width', cellSize)
      .attr('height', cellSize)
      .attr('x', (d: any) => this.d3.timeWeek.count(this.d3.timeYear(d), d) * cellSize)
      .attr('y', (d: any) => d.getDay() * cellSize)
      .attr('fill', (d: any) => {
        const dateStr = this.d3.timeFormat('%Y-%m-%d')(d);
        const value = processedData.get(dateStr);
        return value ? colorScale(value) : '#eee';
      })
      .attr('stroke', '#fff');

    // Add month labels
    svg.selectAll('.month')
      .data(this.d3.timeMonths(new Date(year, 0, 1), new Date(year + 1, 0, 1)))
      .enter()
      .append('text')
      .attr('class', 'month')
      .attr('x', (d: any) => this.d3.timeWeek.count(this.d3.timeYear(d), d) * cellSize)
      .attr('y', -5)
      .text(this.d3.timeFormat('%B'))
      .attr('font-size', '12px')
      .attr('font-weight', 'bold');
  }

  private async createSunburst(viz: D3Visualization): Promise<void> {
    const { data, dimensions, config, containerSelector } = viz;
    const { width, height } = dimensions;
    const radius = Math.min(width, height) / 2;

    // Clear existing content
    this.d3.select(containerSelector).selectAll('*').remove();

    const svg = this.d3.select(containerSelector)
      .append('svg')
      .attr('width', width)
      .attr('height', height);

    const g = svg.append('g')
      .attr('transform', `translate(${width / 2},${height / 2})`);

    // Create partition layout
    const partition = this.d3.partition()
      .size([2 * Math.PI, radius]);

    const root = this.d3.hierarchy(data)
      .sum((d: any) => d.value)
      .sort((a: any, b: any) => b.value - a.value);

    partition(root);

    // Create color scale
    const colorScale = this.d3.scaleOrdinal()
      .domain(root.descendants().map((d: any) => d.data.name))
      .range(config.colors || this.d3.schemeCategory10);

    // Create arc generator
    const arc = this.d3.arc()
      .startAngle((d: any) => d.x0)
      .endAngle((d: any) => d.x1)
      .innerRadius((d: any) => d.y0)
      .outerRadius((d: any) => d.y1);

    // Create sunburst segments
    g.selectAll('path')
      .data(root.descendants())
      .enter()
      .append('path')
      .attr('d', arc)
      .attr('fill', (d: any) => colorScale(d.data.name))
      .attr('stroke', '#fff')
      .attr('stroke-width', 1);

    // Add labels for larger segments
    g.selectAll('text')
      .data(root.descendants().filter((d: any) => d.depth && (d.y1 - d.y0) * (d.x1 - d.x0) > 0.03))
      .enter()
      .append('text')
      .attr('transform', (d: any) => {
        const x = (d.x0 + d.x1) / 2 * 180 / Math.PI;
        const y = (d.y0 + d.y1) / 2;
        return `rotate(${x - 90}) translate(${y},0) rotate(${x < 180 ? 0 : 180})`;
      })
      .attr('dy', '0.35em')
      .text((d: any) => d.data.name)
      .attr('font-size', '10px')
      .attr('text-anchor', 'middle');
  }

  updateD3Visualization(vizId: string, newData: any): void {
    const viz = this.d3Visualizations.find(v => v.id === vizId);
    if (!viz) {
      throw new Error(`D3 visualization with ID ${vizId} not found`);
    }

    viz.data = newData;
    viz.updatedAt = new Date().toISOString();

    // Recreate the visualization with new data
    this.createD3Visualization(viz.containerSelector, viz);
    this.saveData();
  }

  destroyD3Visualization(vizId: string): boolean {
    const vizIndex = this.d3Visualizations.findIndex(v => v.id === vizId);
    if (vizIndex === -1) return false;

    const viz = this.d3Visualizations[vizIndex];
    
    // Clear the container
    if (typeof window !== 'undefined') {
      this.d3?.select(viz.containerSelector).selectAll('*').remove();
    }

    this.d3Visualizations.splice(vizIndex, 1);
    this.saveData();
    return true;
  }

  // Widget Management
  createWidget(
    widgetData: Omit<DashboardWidget, 'id' | 'createdAt' | 'updatedAt'>,
    tenantId: string,
    createdBy: string
  ): DashboardWidget {
    const widget: DashboardWidget = {
      ...widgetData,
      id: this.generateId(),
      tenantId,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.widgets.push(widget);
    this.saveData();
    return widget;
  }

  updateWidget(widgetId: string, updates: Partial<DashboardWidget>): DashboardWidget | undefined {
    const widgetIndex = this.widgets.findIndex(w => w.id === widgetId);
    if (widgetIndex === -1) return undefined;

    this.widgets[widgetIndex] = {
      ...this.widgets[widgetIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveData();
    return this.widgets[widgetIndex];
  }

  // Dashboard Management
  createDashboard(
    dashboardData: Omit<Dashboard, 'id' | 'createdAt' | 'updatedAt'>,
    tenantId: string,
    createdBy: string
  ): Dashboard {
    const dashboard: Dashboard = {
      ...dashboardData,
      id: this.generateId(),
      tenantId,
      createdBy,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    this.dashboards.push(dashboard);
    this.saveData();
    return dashboard;
  }

  updateDashboard(dashboardId: string, updates: Partial<Dashboard>): Dashboard | undefined {
    const dashboardIndex = this.dashboards.findIndex(d => d.id === dashboardId);
    if (dashboardIndex === -1) return undefined;

    this.dashboards[dashboardIndex] = {
      ...this.dashboards[dashboardIndex],
      ...updates,
      updatedAt: new Date().toISOString()
    };

    this.saveData();
    return this.dashboards[dashboardIndex];
  }

  // Template Management
  createTemplate(
    templateData: Omit<VisualizationTemplate, 'id' | 'createdAt'>,
    tenantId: string,
    createdBy: string
  ): VisualizationTemplate {
    const template: VisualizationTemplate = {
      ...templateData,
      id: this.generateId(),
      tenantId,
      createdBy,
      createdAt: new Date().toISOString()
    };

    this.templates.push(template);
    this.saveData();
    return template;
  }

  // Data Processing Helpers
  processPatientProgressData(patientData: any[]): ChartConfig {
    const labels = patientData.map(d => d.date);
    const data = patientData.map(d => d.progressScore);

    return {
      type: 'line',
      data: {
        labels,
        datasets: [{
          label: 'Progress Score',
          data,
          borderColor: '#4F46E5',
          backgroundColor: 'rgba(79, 70, 229, 0.1)',
          borderWidth: 2,
          fill: true,
          tension: 0.4
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Patient Progress Over Time'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Progress Score'
            }
          }
        }
      }
    };
  }

  processAppointmentStatusData(appointments: any[]): ChartConfig {
    const statusCounts = appointments.reduce((acc, app) => {
      acc[app.status] = (acc[app.status] || 0) + 1;
      return acc;
    }, {});

    return {
      type: 'doughnut',
      data: {
        labels: Object.keys(statusCounts),
        datasets: [{
          data: Object.values(statusCounts),
          backgroundColor: [
            '#10B981',
            '#3B82F6',
            '#EF4444',
            '#F59E0B'
          ],
          borderWidth: 0
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Appointment Status Distribution'
          },
          legend: {
            position: 'bottom'
          }
        }
      }
    };
  }

  processRevenueData(revenueData: any[]): ChartConfig {
    const labels = revenueData.map(d => d.month);
    const data = revenueData.map(d => d.revenue);

    return {
      type: 'bar',
      data: {
        labels,
        datasets: [{
          label: 'Revenue (BRL)',
          data,
          backgroundColor: '#059669',
          borderColor: '#047857',
          borderWidth: 1
        }]
      },
      options: {
        responsive: true,
        plugins: {
          title: {
            display: true,
            text: 'Monthly Revenue'
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            title: {
              display: true,
              text: 'Revenue (BRL)'
            }
          }
        }
      }
    };
  }

  processExerciseHeatmapData(exerciseData: any[]): any[] {
    return exerciseData.map(d => ({
      x: d.exercise,
      y: d.patient,
      value: d.completionRate
    }));
  }

  private generateId(): string {
    return `VIZ_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  // Public API Methods
  getChartInstances(): Map<string, any> {
    return this.chartInstances;
  }

  getD3Visualizations(): D3Visualization[] {
    return this.d3Visualizations;
  }

  getWidgets(tenantId: string): DashboardWidget[] {
    return this.widgets.filter(w => w.tenantId === tenantId);
  }

  getDashboards(tenantId: string): Dashboard[] {
    return this.dashboards.filter(d => d.tenantId === tenantId);
  }

  getTemplates(tenantId: string, category?: string): VisualizationTemplate[] {
    let templates = this.templates.filter(t => t.tenantId === tenantId || t.isBuiltIn);
    
    if (category) {
      templates = templates.filter(t => t.category === category);
    }

    return templates;
  }

  deleteWidget(widgetId: string): boolean {
    const initialLength = this.widgets.length;
    this.widgets = this.widgets.filter(w => w.id !== widgetId);
    
    if (this.widgets.length < initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  deleteDashboard(dashboardId: string): boolean {
    const initialLength = this.dashboards.length;
    this.dashboards = this.dashboards.filter(d => d.id !== dashboardId);
    
    if (this.dashboards.length < initialLength) {
      this.saveData();
      return true;
    }
    return false;
  }

  exportDashboard(dashboardId: string): any {
    const dashboard = this.dashboards.find(d => d.id === dashboardId);
    if (!dashboard) return null;

    const dashboardWidgets = this.widgets.filter(w => dashboard.widgets.includes(w.id));

    return {
      dashboard,
      widgets: dashboardWidgets,
      exportedAt: new Date().toISOString()
    };
  }

  importDashboard(dashboardData: any, tenantId: string, createdBy: string): Dashboard {
    // Import widgets first
    const importedWidgets = dashboardData.widgets.map((widget: any) => {
      return this.createWidget({
        ...widget,
        id: undefined,
        tenantId: undefined,
        createdBy: undefined,
        createdAt: undefined,
        updatedAt: undefined
      }, tenantId, createdBy);
    });

    // Import dashboard with new widget IDs
    const importedDashboard = this.createDashboard({
      ...dashboardData.dashboard,
      id: undefined,
      widgets: importedWidgets.map(w => w.id),
      tenantId: undefined,
      createdBy: undefined,
      createdAt: undefined,
      updatedAt: undefined
    }, tenantId, createdBy);

    return importedDashboard;
  }
}

export const visualizationService = new VisualizationService();

// React Hook for Visualization
export const useVisualization = () => {
  const createChart = (canvasId: string, config: ChartConfig, containerId?: string) =>
    visualizationService.createChart(canvasId, config, containerId);
    
  const updateChart = (chartId: string, newData: any) =>
    visualizationService.updateChart(chartId, newData);
    
  const destroyChart = (chartId: string) => visualizationService.destroyChart(chartId);
  
  const createD3Visualization = (containerSelector: string, visualization: any) =>
    visualizationService.createD3Visualization(containerSelector, visualization);
    
  const updateD3Visualization = (vizId: string, newData: any) =>
    visualizationService.updateD3Visualization(vizId, newData);
    
  const destroyD3Visualization = (vizId: string) =>
    visualizationService.destroyD3Visualization(vizId);
    
  const createWidget = (widgetData: any, tenantId: string, createdBy: string) =>
    visualizationService.createWidget(widgetData, tenantId, createdBy);
    
  const updateWidget = (widgetId: string, updates: any) =>
    visualizationService.updateWidget(widgetId, updates);
    
  const createDashboard = (dashboardData: any, tenantId: string, createdBy: string) =>
    visualizationService.createDashboard(dashboardData, tenantId, createdBy);
    
  const updateDashboard = (dashboardId: string, updates: any) =>
    visualizationService.updateDashboard(dashboardId, updates);
    
  const createTemplate = (templateData: any, tenantId: string, createdBy: string) =>
    visualizationService.createTemplate(templateData, tenantId, createdBy);

  // Data processing helpers
  const processPatientProgressData = (patientData: any[]) =>
    visualizationService.processPatientProgressData(patientData);
    
  const processAppointmentStatusData = (appointments: any[]) =>
    visualizationService.processAppointmentStatusData(appointments);
    
  const processRevenueData = (revenueData: any[]) =>
    visualizationService.processRevenueData(revenueData);
    
  const processExerciseHeatmapData = (exerciseData: any[]) =>
    visualizationService.processExerciseHeatmapData(exerciseData);

  // Getters
  const getChartInstances = () => visualizationService.getChartInstances();
  const getD3Visualizations = () => visualizationService.getD3Visualizations();
  const getWidgets = (tenantId: string) => visualizationService.getWidgets(tenantId);
  const getDashboards = (tenantId: string) => visualizationService.getDashboards(tenantId);
  const getTemplates = (tenantId: string, category?: string) => 
    visualizationService.getTemplates(tenantId, category);
  const deleteWidget = (widgetId: string) => visualizationService.deleteWidget(widgetId);
  const deleteDashboard = (dashboardId: string) => visualizationService.deleteDashboard(dashboardId);
  const exportDashboard = (dashboardId: string) => visualizationService.exportDashboard(dashboardId);
  const importDashboard = (dashboardData: any, tenantId: string, createdBy: string) =>
    visualizationService.importDashboard(dashboardData, tenantId, createdBy);

  return {
    createChart,
    updateChart,
    destroyChart,
    createD3Visualization,
    updateD3Visualization,
    destroyD3Visualization,
    createWidget,
    updateWidget,
    createDashboard,
    updateDashboard,
    createTemplate,
    processPatientProgressData,
    processAppointmentStatusData,
    processRevenueData,
    processExerciseHeatmapData,
    getChartInstances,
    getD3Visualizations,
    getWidgets,
    getDashboards,
    getTemplates,
    deleteWidget,
    deleteDashboard,
    exportDashboard,
    importDashboard
  };
};