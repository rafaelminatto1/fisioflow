/**
 * Componente de lista virtualizada para performance em listas grandes
 * Resolve problemas de lag em listas com muitos pacientes/dados
 */

import React, { memo, useMemo, useState, useCallback, useRef, useEffect } from 'react';
import { FixedSizeList as List, VariableSizeList, ListChildComponentProps } from 'react-window';
import { Search, Filter, ChevronDown, MoreVertical } from 'lucide-react';
import { useOptimizedDebounce, useStableCallback } from '../../hooks/useOptimizedComponent';

interface VirtualizedListProps<T> {
  items: T[];
  renderItem: (item: T, index: number, style: React.CSSProperties) => React.ReactNode;
  getItemKey?: (index: number, item: T) => string | number;
  height?: number;
  itemHeight?: number | ((index: number) => number);
  searchable?: boolean;
  filterable?: boolean;
  searchPlaceholder?: string;
  onItemClick?: (item: T, index: number) => void;
  className?: string;
  emptyMessage?: string;
  loading?: boolean;
  enableInfiniteScroll?: boolean;
  onLoadMore?: () => void;
  hasNextPage?: boolean;
}

// Item wrapper para lista fixa
const FixedListItem = memo(({ 
  index, 
  style, 
  data 
}: ListChildComponentProps & { data: { items: any[]; renderItem: (item: any, index: number, style: React.CSSProperties) => React.ReactNode } }) => {
  const { items, renderItem } = data;
  const item = items[index];
  
  if (!item) return null;
  
  return (
    <div style={style}>
      {renderItem(item, index, style)}
    </div>
  );
});

FixedListItem.displayName = 'FixedListItem';

// Item wrapper para lista variável
const VariableListItem = memo(({ 
  index, 
  style, 
  data 
}: ListChildComponentProps & { data: { items: any[]; renderItem: (item: any, index: number, style: React.CSSProperties) => React.ReactNode } }) => {
  const { items, renderItem } = data;
  const item = items[index];
  
  if (!item) return null;
  
  return (
    <div style={style}>
      {renderItem(item, index, style)}
    </div>
  );
});

VariableListItem.displayName = 'VariableListItem';

// Hook para busca otimizada
const useOptimizedSearch = (items: any[], searchFields: string[]) => {
  const [searchTerm, setSearchTerm] = useState('');
  const debouncedSearch = useOptimizedDebounce(searchTerm, 300);
  
  const filteredItems = useMemo(() => {
    if (!debouncedSearch.trim()) return items;
    
    const term = debouncedSearch.toLowerCase();
    return items.filter(item => 
      searchFields.some(field => {
        const value = item[field];
        return value && String(value).toLowerCase().includes(term);
      })
    );
  }, [items, debouncedSearch, searchFields]);
  
  return {
    searchTerm,
    setSearchTerm,
    filteredItems,
    isFiltered: Boolean(debouncedSearch.trim()),
  };
};

function VirtualizedList<T extends Record<string, any>>({
  items,
  renderItem,
  getItemKey,
  height = 400,
  itemHeight = 60,
  searchable = false,
  filterable = false,
  searchPlaceholder = 'Buscar...',
  onItemClick,
  className = '',
  emptyMessage = 'Nenhum item encontrado',
  loading = false,
  enableInfiniteScroll = false,
  onLoadMore,
  hasNextPage = false,
}: VirtualizedListProps<T>) {
  const listRef = useRef<any>(null);
  const [scrolling, setScrolling] = useState(false);
  const scrollTimer = useRef<NodeJS.Timeout>();
  
  // Configurar busca se habilitada
  const searchFields = useMemo(() => {
    if (!searchable || !items.length) return [];
    
    // Inferir campos de busca com base no primeiro item
    const firstItem = items[0];
    return Object.keys(firstItem).filter(key => 
      typeof firstItem[key] === 'string' || typeof firstItem[key] === 'number'
    ) as (keyof T)[];
  }, [items, searchable]);
  
  const { searchTerm, setSearchTerm, filteredItems, isFiltered } = useOptimizedSearch(
    items, 
    searchFields
  );
  
  // Handle scroll events
  const handleScroll = useStableCallback(({ scrollOffset }: { scrollOffset: number }) => {
    if (!scrolling) {
      setScrolling(true);
    }
    
    // Clear existing timer
    if (scrollTimer.current) {
      clearTimeout(scrollTimer.current);
    }
    
    // Set timer to detect scroll end
    scrollTimer.current = setTimeout(() => {
      setScrolling(false);
    }, 150);
    
    // Infinite scroll
    if (enableInfiniteScroll && onLoadMore && hasNextPage) {
      const listElement = listRef.current;
      if (listElement) {
        const { scrollHeight } = listElement;
        const threshold = scrollHeight * 0.8; // 80% do scroll
        
        if (scrollOffset >= threshold) {
          onLoadMore();
        }
      }
    }
  }, [enableInfiniteScroll, onLoadMore, hasNextPage, scrolling]);
  
  // Preparar dados para a lista
  const listData = useMemo(() => ({
    items: filteredItems,
    renderItem: (item: T, index: number, style: React.CSSProperties) => {
      const wrappedItem = (
        <div 
          onClick={() => onItemClick?.(item, index)}
          className={onItemClick ? 'cursor-pointer' : ''}
        >
          {renderItem(item, index, style)}
        </div>
      );
      
      return wrappedItem;
    },
  }), [filteredItems, renderItem, onItemClick]);
  
  // Key extractor
  const itemKey = useStableCallback((index: number) => {
    if (getItemKey) return getItemKey(index, filteredItems[index]);
    
    const item = filteredItems[index];
    if (item?.id) return item.id;
    if (item?.key) return item.key;
    
    return index;
  }, [filteredItems, getItemKey]);
  
  // Determinar tipo de lista (fixa ou variável)
  const isVariableHeight = typeof itemHeight === 'function';
  
  // Cleanup timer
  useEffect(() => {
    return () => {
      if (scrollTimer.current) {
        clearTimeout(scrollTimer.current);
      }
    };
  }, []);
  
  return (
    <div className={`virtualized-list ${className}`}>
      {/* Header com busca/filtros */}
      {(searchable || filterable) && (
        <div className="mb-4 flex gap-2">
          {searchable && (
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <input
                type="text"
                placeholder={searchPlaceholder}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full rounded-md border border-input bg-background pl-10 pr-4 py-2 text-sm ring-offset-background transition-colors placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
              />
            </div>
          )}
          
          {filterable && (
            <button className="inline-flex items-center justify-center rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <Filter className="h-4 w-4 mr-2" />
              Filtros
              <ChevronDown className="h-4 w-4 ml-1" />
            </button>
          )}
        </div>
      )}
      
      {/* Status/Loading */}
      {loading && (
        <div className="flex items-center justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="ml-2 text-sm text-muted-foreground">Carregando...</span>
        </div>
      )}
      
      {/* Lista ou Empty State */}
      {!loading && (
        <>
          {filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 text-center">
              <div className="text-4xl mb-4">📋</div>
              <h3 className="text-lg font-medium mb-2">
                {isFiltered ? 'Nenhum resultado encontrado' : emptyMessage}
              </h3>
              {isFiltered && (
                <p className="text-sm text-muted-foreground mb-4">
                  Tente ajustar sua busca ou filtros
                </p>
              )}
            </div>
          ) : (
            <div className="border rounded-md overflow-hidden">
              {isVariableHeight ? (
                <VariableSizeList
                  ref={listRef}
                  height={height}
                  itemCount={filteredItems.length}
                  itemSize={itemHeight as (index: number) => number}
                  itemData={listData}
                  itemKey={itemKey}
                  onScroll={handleScroll}
                  className="scrollbar-thin"
                >
                  {VariableListItem}
                </VariableSizeList>
              ) : (
                <List
                  ref={listRef}
                  height={height}
                  itemCount={filteredItems.length}
                  itemSize={itemHeight as number}
                  itemData={listData}
                  itemKey={itemKey}
                  onScroll={handleScroll}
                  className="scrollbar-thin"
                >
                  {FixedListItem}
                </List>
              )}
              
              {/* Infinite scroll indicator */}
              {enableInfiniteScroll && hasNextPage && (
                <div className="flex items-center justify-center py-4 border-t bg-muted/50">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary mr-2"></div>
                  <span className="text-sm text-muted-foreground">Carregando mais...</span>
                </div>
              )}
            </div>
          )}
          
          {/* Status da lista */}
          {filteredItems.length > 0 && (
            <div className="mt-2 text-xs text-muted-foreground text-center">
              {isFiltered && (
                <span>
                  {filteredItems.length} de {items.length} itens
                  {scrolling && ' • Rolando...'}
                </span>
              )}
              {!isFiltered && (
                <span>
                  {filteredItems.length} itens
                  {scrolling && ' • Rolando...'}
                </span>
              )}
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default memo(VirtualizedList) as typeof VirtualizedList;