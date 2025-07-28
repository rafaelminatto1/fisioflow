import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';

// Componente de exemplo para teste
function Button({
  children,
  onClick,
}: {
  children: React.ReactNode;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded bg-blue-500 px-4 py-2 text-white"
    >
      {children}
    </button>
  );
}

describe('Button Component', () => {
  it('renders correctly', () => {
    render(<Button>Click me</Button>);
    expect(screen.getByRole('button')).toBeInTheDocument();
    expect(screen.getByText('Click me')).toBeInTheDocument();
  });

  it('displays the correct text', () => {
    render(<Button>Test Button</Button>);
    expect(screen.getByText('Test Button')).toBeInTheDocument();
  });
});

// Teste simples de função
describe('Math functions', () => {
  it('should add numbers correctly', () => {
    expect(2 + 2).toBe(4);
  });

  it('should multiply numbers correctly', () => {
    expect(3 * 4).toBe(12);
  });
});
