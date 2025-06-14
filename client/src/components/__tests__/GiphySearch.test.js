import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import GiphySearch from '../GiphySearch';

// Mock axios before any other imports
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    create: jest.fn(() => ({
      get: jest.fn(),
      post: jest.fn(),
      delete: jest.fn()
    }))
  }
}));

// Import axios after mocking
import axios from 'axios';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'common.search': 'Search',
        'common.save': 'Save',
        'common.remove': 'Remove'
      };
      return translations[key] || key;
    },
  }),
}));

// Mock console methods
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockUser = {
  email: 'test@example.com',
  token: 'test-token'
};

const mockGifs = [
  {
    id: '1',
    title: 'Test GIF 1',
    images: {
      original: { url: 'https://example.com/gif1-original.gif' },
      fixed_height: { url: 'https://example.com/gif1-fixed.gif' }
    }
  },
  {
    id: '2',
    title: 'Test GIF 2',
    images: {
      original: { url: 'https://example.com/gif2-original.gif' },
      fixed_height: { url: 'https://example.com/gif2-fixed.gif' }
    }
  }
];

describe('GiphySearch Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should render search form correctly', () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: [] } }),
      post: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    expect(screen.getByPlaceholderText('Search for GIFs...')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
  });

  it('should handle form submission and search for GIFs', async () => {
    const mockGiphyResponse = {
      data: {
        data: mockGifs
      }
    };

    axios.get.mockResolvedValue(mockGiphyResponse);

    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: [] } }),
      post: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    const searchInput = screen.getByPlaceholderText('Search for GIFs...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'funny cats' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledWith(
        'https://api.giphy.com/v1/gifs/search',
        expect.objectContaining({
          params: expect.objectContaining({
            q: 'funny cats',
            limit: 20,
            rating: 'g'
          })
        })
      );
    });

    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
      expect(screen.getByAltText('Test GIF 2')).toBeInTheDocument();
    });
  });

  it('should handle search error gracefully', async () => {
    const error = new Error('API Error');
    axios.get.mockRejectedValue(error);

    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: [] } }),
      post: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    const searchInput = screen.getByPlaceholderText('Search for GIFs...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to fetch GIFs. Please try again.')).toBeInTheDocument();
    });
  });

  it('should not submit form with empty search term', () => {
    axios.get.mockResolvedValue({ data: { data: [] } });

    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: [] } }),
      post: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    const searchButton = screen.getByText('Search');
    fireEvent.click(searchButton);

    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should save GIF when save button is clicked', async () => {
    const mockGiphyResponse = {
      data: {
        data: mockGifs
      }
    };

    axios.get.mockResolvedValue(mockGiphyResponse);

    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: [] } }),
      post: jest.fn().mockResolvedValue({}),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    const searchInput = screen.getByPlaceholderText('Search for GIFs...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.submit(searchInput.closest('form'));

    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    const saveButtons = screen.getAllByText('Save');
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(authAxiosInstance.post).toHaveBeenCalledWith(
        'http://localhost:3000/gifs/save',
        expect.objectContaining({
          id: '1',
          title: 'Test GIF 1',
          url: 'https://example.com/gif1-original.gif',
          preview: 'https://example.com/gif1-fixed.gif',
          tags: []
        })
      );
    });
  });

  it('should handle save GIF error', async () => {
    const mockGiphyResponse = {
      data: {
        data: mockGifs
      }
    };

    axios.get.mockResolvedValue(mockGiphyResponse);

    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: [] } }),
      post: jest.fn().mockRejectedValue({ response: { data: 'Save failed' } }),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    const searchInput = screen.getByPlaceholderText('Search for GIFs...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.submit(searchInput.closest('form'));

    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    const saveButtons = screen.getAllByText('Save');
    fireEvent.click(saveButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Failed to save GIF. Please try again.')).toBeInTheDocument();
    });
  });

  it('should remove saved GIF when remove button is clicked', async () => {
    const mockGiphyResponse = {
      data: {
        data: mockGifs
      }
    };

    axios.get.mockResolvedValue(mockGiphyResponse);

    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: [{ id: '1' }] } }),
      post: jest.fn(),
      delete: jest.fn().mockResolvedValue({})
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    // Wait for saved GIFs to load
    await waitFor(() => {
      expect(authAxiosInstance.get).toHaveBeenCalled();
    });

    const searchInput = screen.getByPlaceholderText('Search for GIFs...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.submit(searchInput.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(authAxiosInstance.delete).toHaveBeenCalledWith('http://localhost:3000/gifs/1');
    });
  });

  it('should handle remove GIF error', async () => {
    const mockGiphyResponse = {
      data: {
        data: mockGifs
      }
    };

    axios.get.mockResolvedValue(mockGiphyResponse);

    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: [{ id: '1' }] } }),
      post: jest.fn(),
      delete: jest.fn().mockRejectedValue({ response: { data: 'Delete failed' } })
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    const searchInput = screen.getByPlaceholderText('Search for GIFs...');
    fireEvent.change(searchInput, { target: { value: 'test' } });
    fireEvent.submit(searchInput.closest('form'));

    await waitFor(() => {
      expect(screen.getByText('Remove')).toBeInTheDocument();
    });

    const removeButton = screen.getByText('Remove');
    fireEvent.click(removeButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to remove GIF. Please try again.')).toBeInTheDocument();
    });
  });

  it('should handle fetch saved GIFs error', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockRejectedValue({ response: { data: 'Fetch failed' } }),
      post: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<GiphySearch user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch saved GIFs. Please try again.')).toBeInTheDocument();
    });
  });
}); 