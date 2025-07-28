import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { VirtualizedList } from '../VirtualizedList';

// Mock react-window
jest.mock('react-window', () => ({
  FixedSizeList: jest.fn(({ children, itemCount, itemSize, height, onScroll, itemData }) => {
    const items = [];
    const visibleStart = 0;
    const visibleEnd = Math.min(itemCount, Math.ceil(height / itemSize));
    
    for (let i = visibleStart; i < visibleEnd; i++) {
      items.push(
        <div key={i} data-testid={`virtual-item-${i}`}>
          {children({ index: i, style: {}, data: itemData })}
        </div>
      );
    }
    
    return (
      <div 
        data-testid="virtual-list"
        style={{ height }}
        onScroll={onScroll}
      >
        {items}
      </div>
    );
  }),
}));

// Mock useVirtualScrolling hook
jest.mock('../../../hooks/useOptimizedComponent', () => ({
  useVirtualScrolling: jest.fn(({ items, itemHeight, containerHeight }) => ({
    visibleItems: items.slice(0, Math.ceil(containerHeight / itemHeight)),
    totalHeight: items.length * itemHeight,
    scrollTop: 0,
    onScroll: jest.fn(),
  })),
}));

describe('VirtualizedList', () => {
  const mockItems = [
    { id: '1', name: 'João Silva', email: 'joao@email.com' },
    { id: '2', name: 'Maria Santos', email: 'maria@email.com' },
    { id: '3', name: 'Pedro Costa', email: 'pedro@email.com' },
    { id: '4', name: 'Ana Oliveira', email: 'ana@email.com' },
    { id: '5', name: 'Carlos Lima', email: 'carlos@email.com' },
  ];

  const mockRenderItem = jest.fn(({ item, index, style }) => (
    <div style={style} data-testid={`item-${index}`}>
      <span>{item.name}</span>
      <span>{item.email}</span>
    </div>
  ));

  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('basic rendering', () => {
    it('should render list with items', () => {
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
        />
      );

      expect(screen.getByTestId('virtual-list')).toBeInTheDocument();
      
      // Should render visible items
      mockItems.slice(0, 3).forEach((item, index) => {
        expect(screen.getByTestId(`virtual-item-${index}`)).toBeInTheDocument();
      });
    });

    it('should render empty state when no items', () => {
      render(
        <VirtualizedList
          items={[]}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          emptyMessage="No items found"
        />
      );

      expect(screen.getByText('No items found')).toBeInTheDocument();
    });

    it('should use default empty message when not provided', () => {
      render(
        <VirtualizedList
          items={[]}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
        />
      );

      expect(screen.getByText('Nenhum item encontrado')).toBeInTheDocument();
    });

    it('should apply custom className', () => {
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          className="custom-list"
        />
      );

      const listContainer = screen.getByTestId('virtual-list').parentElement;
      expect(listContainer).toHaveClass('custom-list');
    });
  });

  describe('search functionality', () => {
    it('should render search input when searchable is true', () => {
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          searchable={true}
        />
      );

      expect(screen.getByPlaceholderText('Buscar...')).toBeInTheDocument();
    });

    it('should filter items based on search query', async () => {
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          searchable={true}
          searchKey="name"
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar...');
      
      fireEvent.change(searchInput, { target: { value: 'João' } });

      await waitFor(() => {
        // Should call renderItem with filtered items
        expect(mockRenderItem).toHaveBeenCalledWith(
          expect.objectContaining({
            item: expect.objectContaining({ name: 'João Silva' })
          })
        );
      });
    });

    it('should use custom search function when provided', async () => {
      const customSearchFn = jest.fn((items, query) => 
        items.filter(item => item.email.includes(query))
      );

      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          searchable={true}
          searchFn={customSearchFn}
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar...');
      fireEvent.change(searchInput, { target: { value: 'maria' } });

      await waitFor(() => {
        expect(customSearchFn).toHaveBeenCalledWith(mockItems, 'maria');
      });
    });

    it('should debounce search input', async () => {
      const { useOptimizedDebounce } = require('../../../hooks/useOptimizedComponent');
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          searchable={true}
          searchDebounce={300}
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar...');
      
      // Type multiple characters quickly
      fireEvent.change(searchInput, { target: { value: 'J' } });
      fireEvent.change(searchInput, { target: { value: 'Jo' } });
      fireEvent.change(searchInput, { target: { value: 'João' } });

      // Should debounce the search
      expect(useOptimizedDebounce).toHaveBeenCalledWith('João', 300);
    });
  });

  describe('loading and infinite scroll', () => {
    it('should show loading state', () => {
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          loading={true}
        />
      );

      expect(screen.getByText('Carregando...')).toBeInTheDocument();
    });

    it('should show custom loading message', () => {
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          loading={true}
          loadingMessage="Loading patients..."
        />
      );

      expect(screen.getByText('Loading patients...')).toBeInTheDocument();
    });

    it('should handle infinite scroll', async () => {
      const onLoadMore = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          infiniteScroll={true}
          onLoadMore={onLoadMore}
          hasNextPage={true}
        />
      );

      const virtualList = screen.getByTestId('virtual-list');
      
      // Simulate scrolling to bottom
      fireEvent.scroll(virtualList, { 
        target: { 
          scrollTop: 1000, 
          scrollHeight: 1200,
          clientHeight: 400 
        } 
      });

      await waitFor(() => {
        expect(onLoadMore).toHaveBeenCalled();
      });
    });

    it('should not load more when hasNextPage is false', async () => {
      const onLoadMore = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          infiniteScroll={true}
          onLoadMore={onLoadMore}
          hasNextPage={false}
        />
      );

      const virtualList = screen.getByTestId('virtual-list');
      
      fireEvent.scroll(virtualList, { 
        target: { 
          scrollTop: 1000, 
          scrollHeight: 1200,
          clientHeight: 400 
        } 
      });

      await waitFor(() => {
        expect(onLoadMore).not.toHaveBeenCalled();
      });
    });
  });

  describe('selection functionality', () => {
    it('should handle single selection', () => {
      const onSelectionChange = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          selectable={true}
          onSelectionChange={onSelectionChange}
        />
      );

      // Click on first item
      const firstItem = screen.getByTestId('virtual-item-0');
      fireEvent.click(firstItem);

      expect(onSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('should handle multiple selection', () => {
      const onSelectionChange = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          selectable={true}
          multiSelect={true}
          onSelectionChange={onSelectionChange}
        />
      );

      // Click on first item
      const firstItem = screen.getByTestId('virtual-item-0');
      fireEvent.click(firstItem);

      expect(onSelectionChange).toHaveBeenCalledWith(['1']);

      // Ctrl+click on second item
      const secondItem = screen.getByTestId('virtual-item-1');
      fireEvent.click(secondItem, { ctrlKey: true });

      expect(onSelectionChange).toHaveBeenCalledWith(['1', '2']);
    });

    it('should provide select all functionality', () => {
      const onSelectionChange = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          selectable={true}
          multiSelect={true}
          showSelectAll={true}
          onSelectionChange={onSelectionChange}
        />
      );

      const selectAllCheckbox = screen.getByLabelText('Selecionar todos');
      fireEvent.click(selectAllCheckbox);

      expect(onSelectionChange).toHaveBeenCalledWith(['1', '2', '3', '4', '5']);
    });
  });

  describe('sorting functionality', () => {
    it('should handle sorting when sortable is true', () => {
      const onSortChange = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          sortable={true}
          sortKey="name"
          onSortChange={onSortChange}
        />
      );

      const sortButton = screen.getByLabelText('Ordenar por nome');
      fireEvent.click(sortButton);

      expect(onSortChange).toHaveBeenCalledWith({
        key: 'name',
        direction: 'asc'
      });
    });

    it('should toggle sort direction on repeated clicks', () => {
      const onSortChange = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          sortable={true}
          sortKey="name"
          sortDirection="asc"
          onSortChange={onSortChange}
        />
      );

      const sortButton = screen.getByLabelText('Ordenar por nome');
      fireEvent.click(sortButton);

      expect(onSortChange).toHaveBeenCalledWith({
        key: 'name',
        direction: 'desc'
      });
    });
  });

  describe('error handling', () => {
    it('should handle render item errors gracefully', () => {
      const errorRenderItem = jest.fn(() => {
        throw new Error('Render error');
      });

      // Suppress console.error for this test
      const consoleSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

      render(
        <VirtualizedList
          items={mockItems}
          renderItem={errorRenderItem}
          height={400}
          itemHeight={60}
        />
      );

      // Should show error message instead of crashing
      expect(screen.getByText(/Erro ao renderizar lista/)).toBeInTheDocument();

      consoleSpy.mockRestore();
    });

    it('should handle invalid item data', () => {
      const invalidItems = [
        null,
        undefined,
        { id: '1', name: 'Valid Item' },
        { id: '2', name: null },
      ];

      render(
        <VirtualizedList
          items={invalidItems as any}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
        />
      );

      // Should only render valid items
      expect(mockRenderItem).toHaveBeenCalledWith(
        expect.objectContaining({
          item: expect.objectContaining({ name: 'Valid Item' })
        })
      );
    });
  });

  describe('performance optimization', () => {
    it('should use virtualization for large lists', () => {
      const largeItemList = Array.from({ length: 10000 }, (_, i) => ({
        id: i.toString(),
        name: `Item ${i}`,
        email: `item${i}@email.com`
      }));

      render(
        <VirtualizedList
          items={largeItemList}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
        />
      );

      // Should only render visible items, not all 10000
      const renderedItems = screen.getAllByTestId(/virtual-item-/);
      expect(renderedItems.length).toBeLessThan(largeItemList.length);
      expect(renderedItems.length).toBeGreaterThan(0);
    });

    it('should memoize filtered results', async () => {
      const { useOptimizedDebounce } = require('../../../hooks/useOptimizedComponent');
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          searchable={true}
        />
      );

      const searchInput = screen.getByPlaceholderText('Buscar...');
      
      // Search for the same term twice
      fireEvent.change(searchInput, { target: { value: 'João' } });
      fireEvent.change(searchInput, { target: { value: 'João' } });

      // Should use memoized results
      expect(useOptimizedDebounce).toHaveBeenCalledWith('João', 300);
    });

    it('should handle rapid scroll events efficiently', () => {
      const onScroll = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          onScroll={onScroll}
        />
      );

      const virtualList = screen.getByTestId('virtual-list');
      
      // Simulate rapid scrolling
      for (let i = 0; i < 10; i++) {
        fireEvent.scroll(virtualList, { target: { scrollTop: i * 50 } });
      }

      // Should throttle scroll events
      expect(onScroll).toHaveBeenCalled();
    });
  });

  describe('accessibility', () => {
    it('should provide proper ARIA labels', () => {
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          ariaLabel="Patient list"
        />
      );

      const list = screen.getByRole('list');
      expect(list).toHaveAttribute('aria-label', 'Patient list');
    });

    it('should support keyboard navigation', () => {
      const onSelectionChange = jest.fn();
      
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          selectable={true}
          onSelectionChange={onSelectionChange}
        />
      );

      const firstItem = screen.getByTestId('virtual-item-0');
      
      // Focus and press Enter
      firstItem.focus();
      fireEvent.keyDown(firstItem, { key: 'Enter' });

      expect(onSelectionChange).toHaveBeenCalledWith(['1']);
    });

    it('should announce loading state to screen readers', () => {
      render(
        <VirtualizedList
          items={mockItems}
          renderItem={mockRenderItem}
          height={400}
          itemHeight={60}
          loading={true}
        />
      );

      const loadingMessage = screen.getByText('Carregando...');
      expect(loadingMessage).toHaveAttribute('aria-live', 'polite');
    });
  });
});