import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Create from '../Create';

// Mock axios before any other imports
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      put: jest.fn(),
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
        'common.loading': 'Loading...',
        'common.delete': 'Delete',
        'create.savedGifs': 'Saved GIFs',
        'create.addCaption': 'Add Caption',
        'create.enterCaption': 'Enter your caption here...',
        'create.saveCaption': 'Save Caption'
      };
      return translations[key] || key;
    },
  }),
}));

// Mock console methods
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

const mockUser = {
  email: 'test@example.com',
  token: 'test-token'
};

const mockSavedGifs = [
  {
    id: '1',
    title: 'Test GIF 1',
    url: 'https://example.com/gif1-original.gif',
    preview: 'https://example.com/gif1-preview.gif',
    caption: 'Existing caption 1'
  },
  {
    id: '2',
    title: 'Test GIF 2',
    url: 'https://example.com/gif2-original.gif',
    preview: 'https://example.com/gif2-preview.gif',
    caption: ''
  }
];

describe('Create Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleError.mockRestore();
  });

  it('should render loading state initially', () => {
    const authAxiosInstance = {
      get: jest.fn(() => new Promise(() => {})), // Never resolves to keep loading state
      put: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render saved GIFs after loading', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Saved GIFs')).toBeInTheDocument();
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
      expect(screen.getByAltText('Test GIF 2')).toBeInTheDocument();
      expect(screen.getByText('Existing caption 1')).toBeInTheDocument();
    });
  });

  it('should handle fetch saved GIFs error', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockRejectedValue(new Error('Fetch failed')),
      put: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch saved GIFs. Please try again.')).toBeInTheDocument();
    });
  });

  it('should select GIF when clicked', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    // Wait for GIFs to load
    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    // Click on the first GIF
    const gifItem = screen.getByAltText('Test GIF 1').closest('.gif-item');
    fireEvent.click(gifItem);

    // Should show meme editor
    await waitFor(() => {
      expect(screen.getByText('Add Caption')).toBeInTheDocument();
      expect(screen.getByDisplayValue('Existing caption 1')).toBeInTheDocument();
    });
  });

  it('should update caption when input changes', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn(),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    // Wait for GIFs to load and select first GIF
    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    const gifItem = screen.getByAltText('Test GIF 1').closest('.gif-item');
    fireEvent.click(gifItem);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing caption 1')).toBeInTheDocument();
    });

    // Change caption
    const captionInput = screen.getByDisplayValue('Existing caption 1');
    fireEvent.change(captionInput, { target: { value: 'New caption text' } });

    expect(screen.getByDisplayValue('New caption text')).toBeInTheDocument();
  });

  it('should save caption when save button is clicked', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn().mockResolvedValue({}),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    // Wait for GIFs to load and select first GIF
    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    const gifItem = screen.getByAltText('Test GIF 1').closest('.gif-item');
    fireEvent.click(gifItem);

    await waitFor(() => {
      expect(screen.getByDisplayValue('Existing caption 1')).toBeInTheDocument();
    });

    // Change caption and save
    const captionInput = screen.getByDisplayValue('Existing caption 1');
    fireEvent.change(captionInput, { target: { value: 'Updated caption' } });

    const saveButton = screen.getByText('Save Caption');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(authAxiosInstance.put).toHaveBeenCalledWith(
        'http://localhost:3000/gifs/1/caption',
        { caption: 'Updated caption' }
      );
    });
  });

  it('should handle save caption error', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn().mockRejectedValue(new Error('Save failed')),
      delete: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    // Wait for GIFs to load and select first GIF
    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    const gifItem = screen.getByAltText('Test GIF 1').closest('.gif-item');
    fireEvent.click(gifItem);

    await waitFor(() => {
      expect(screen.getByText('Save Caption')).toBeInTheDocument();
    });

    // Try to save caption
    const saveButton = screen.getByText('Save Caption');
    fireEvent.click(saveButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to save caption. Please try again.')).toBeInTheDocument();
    });
  });

  it('should delete GIF when delete button is clicked', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn(),
      delete: jest.fn().mockResolvedValue({})
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    // Wait for GIFs to load
    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    // Click delete button for first GIF
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(authAxiosInstance.delete).toHaveBeenCalledWith('http://localhost:3000/gifs/1');
    });

    // GIF should be removed from the list
    await waitFor(() => {
      expect(screen.queryByAltText('Test GIF 1')).not.toBeInTheDocument();
    });
  });

  it('should handle delete GIF error', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn(),
      delete: jest.fn().mockRejectedValue(new Error('Delete failed'))
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    // Wait for GIFs to load
    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    // Click delete button for first GIF
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Failed to delete GIF. Please try again.')).toBeInTheDocument();
    });
  });

  it('should clear selected GIF when deleted GIF was selected', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn(),
      delete: jest.fn().mockResolvedValue({})
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    // Wait for GIFs to load and select first GIF
    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    const gifItem = screen.getByAltText('Test GIF 1').closest('.gif-item');
    fireEvent.click(gifItem);

    await waitFor(() => {
      expect(screen.getByText('Add Caption')).toBeInTheDocument();
    });

    // Delete the selected GIF
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.queryByText('Add Caption')).not.toBeInTheDocument();
    });
  });

  it('should prevent event propagation when delete button is clicked', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { gifs: mockSavedGifs } }),
      put: jest.fn(),
      delete: jest.fn().mockResolvedValue({})
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    // Wait for GIFs to load
    await waitFor(() => {
      expect(screen.getByAltText('Test GIF 1')).toBeInTheDocument();
    });

    // Click delete button - this should not select the GIF
    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    // Should not show meme editor (GIF should not be selected)
    expect(screen.queryByText('Add Caption')).not.toBeInTheDocument();
  });
}); 