import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import Dashboard from '../Dashboard';

// Mock the GiphySearch component
jest.mock('../GiphySearch', () => {
  return function MockGiphySearch({ user }) {
    return <div data-testid="giphy-search">GiphySearch Component - User: {user?.email}</div>;
  };
});

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'common.profile': 'Profile',
        'common.welcome': 'Welcome',
        'common.email': 'Email',
        'common.signOut': 'Sign Out',
        'dashboard.searchAndShare': 'Search and Share GIFs'
      };
      return translations[key] || key;
    },
  }),
}));

// Mock useNavigate
const mockNavigate = jest.fn();
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => mockNavigate,
}));

const renderDashboard = (props = {}) => {
  const defaultProps = {
    user: {
      name: 'John Doe',
      email: 'john@example.com',
      picture: 'https://example.com/profile.jpg',
      token: 'test-token'
    },
    onSignOut: jest.fn()
  };
  
  return render(
    <BrowserRouter>
      <Dashboard {...defaultProps} {...props} />
    </BrowserRouter>
  );
};

describe('Dashboard Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render dashboard with user information', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john@example.com',
      picture: 'https://example.com/profile.jpg',
      token: 'test-token'
    };

    renderDashboard({ user: mockUser });

    expect(screen.getByText('Welcome, John Doe!')).toBeInTheDocument();
    expect(screen.getByText('Email: john@example.com')).toBeInTheDocument();
    expect(screen.getByAltText('Profile')).toHaveAttribute('src', 'https://example.com/profile.jpg');
    expect(screen.getByText('Search and Share GIFs')).toBeInTheDocument();
  });

  it('should render dashboard without profile picture when not provided', () => {
    const mockUser = {
      name: 'Jane Doe',
      email: 'jane@example.com',
      token: 'test-token'
    };

    renderDashboard({ user: mockUser });

    expect(screen.getByText('Welcome, Jane Doe!')).toBeInTheDocument();
    expect(screen.getByText('Email: jane@example.com')).toBeInTheDocument();
    expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
  });

  it('should render GiphySearch component with user prop', () => {
    const mockUser = {
      name: 'John Doe',
      email: 'john@example.com',
      token: 'test-token'
    };

    renderDashboard({ user: mockUser });

    const giphySearch = screen.getByTestId('giphy-search');
    expect(giphySearch).toBeInTheDocument();
    expect(giphySearch).toHaveTextContent('GiphySearch Component - User: john@example.com');
  });

  it('should call onSignOut and navigate when sign out button is clicked', () => {
    const mockOnSignOut = jest.fn();
    
    renderDashboard({ onSignOut: mockOnSignOut });

    const signOutButton = screen.getByText('Sign Out');
    fireEvent.click(signOutButton);

    expect(mockOnSignOut).toHaveBeenCalledTimes(1);
    expect(mockNavigate).toHaveBeenCalledWith('/');
  });

  it('should handle missing user data gracefully', () => {
    renderDashboard({ user: null });

    expect(screen.getByText('Welcome, !')).toBeInTheDocument();
    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
  });

  it('should render dashboard with partial user data', () => {
    const partialUser = {
      name: 'Partial User'
      // missing email, picture, token
    };

    renderDashboard({ user: partialUser });

    expect(screen.getByText('Welcome, Partial User!')).toBeInTheDocument();
    expect(screen.getByText('Email:')).toBeInTheDocument();
    expect(screen.queryByAltText('Profile')).not.toBeInTheDocument();
  });
}); 