import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import Create from '../Create';

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    }))
  }
}));

import axios from 'axios';

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'common.loading': 'Loading...',
        'common.delete': 'Delete'
      };
      return translations[key] || key;
    },
  }),
}));

const mockUser = {
  email: 'test@example.com',
  token: 'test-token'
};

const mockWeatherCollections = [
  {
    id: '1',
    title: 'New York Weather',
    location: 'New York (40.7128, -74.0060)',
    startDate: '2023-01-01',
    endDate: '2023-01-07',
    weatherData: {
      daily: {
        time: ['2023-01-01', '2023-01-02'],
        weather_code: [0, 1],
        temperature_2m_max: [20, 22],
        temperature_2m_min: [15, 17]
      }
    },
    photos: {
      '2023-01-01': '/uploads/photos/photo1.jpg'
    }
  },
  {
    id: '2',
    title: 'Chicago Weather',
    location: 'Chicago (41.8781, -87.6298)',
    startDate: '2023-01-10',
    endDate: '2023-01-17',
    weatherData: {
      daily: {
        time: ['2023-01-10', '2023-01-11'],
        weather_code: [2, 3],
        temperature_2m_max: [18, 20],
        temperature_2m_min: [12, 14]
      }
    },
    photos: {}
  }
];

describe('Create Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render loading state initially', () => {
    const authAxiosInstance = {
      get: jest.fn(() => new Promise(() => {})),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('should render weather collections after loading', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Saved Weather Collections')).toBeInTheDocument();
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
      expect(screen.getByText('Chicago Weather')).toBeInTheDocument();
    });
  });

  it('should handle fetch error', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockRejectedValue(new Error('Fetch failed')),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Failed to fetch weather collections. Please try again.')).toBeInTheDocument();
    });
  });

  it('should select collection when clicked', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const collectionItem = screen.getByText('New York Weather').closest('.collection-item');
    fireEvent.click(collectionItem);

    await waitFor(() => {
      expect(screen.getByText('Edit Collection')).toBeInTheDocument();
    });
  });

  it('should update and save title', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn().mockResolvedValue({}),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const collectionItem = screen.getByText('New York Weather').closest('.collection-item');
    fireEvent.click(collectionItem);

    await waitFor(() => {
      const titleInput = screen.getByDisplayValue('New York Weather');
      fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

      const saveButton = screen.getByText('Save Title');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(authAxiosInstance.put).toHaveBeenCalledWith(
        'http://localhost:3000/weather/1/title',
        { title: 'Updated Title' }
      );
    });
  });

  it('should delete collection', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn().mockResolvedValue({}),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(authAxiosInstance.delete).toHaveBeenCalledWith('http://localhost:3000/weather/1');
    });
  });

  it('should handle delete error', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn().mockRejectedValue(new Error('Delete failed')),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const deleteButtons = screen.getAllByText('Delete');
    fireEvent.click(deleteButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Failed to delete collection. Please try again.')).toBeInTheDocument();
    });
  });

  it('should display weather days when collection is selected', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const collectionItem = screen.getByText('New York Weather').closest('.collection-item');
    fireEvent.click(collectionItem);

    await waitFor(() => {
      expect(screen.getByText('Weather Days')).toBeInTheDocument();
      expect(screen.getByText('Clear sky')).toBeInTheDocument();
      expect(screen.getByText('Mainly clear')).toBeInTheDocument();
    });
  });

  it('should select date and show photo upload', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const collectionItem = screen.getByText('New York Weather').closest('.collection-item');
    fireEvent.click(collectionItem);

    await waitFor(() => {
      const dayItems = screen.getAllByText(/Clear sky|Mainly clear/);
      const firstDayItem = dayItems[0].closest('.day-item');
      fireEvent.click(firstDayItem);
    });

    await waitFor(() => {
      expect(screen.getByText(/Add Photo for/)).toBeInTheDocument();
    });
  });

  it('should upload photo', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn().mockResolvedValue({ data: { photoUrl: '/uploads/photos/new-photo.jpg' } })
    };
    axios.create.mockReturnValue(authAxiosInstance);

    const mockFile = new File(['test'], 'test.jpg', { type: 'image/jpeg' });

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const collectionItem = screen.getByText('New York Weather').closest('.collection-item');
    fireEvent.click(collectionItem);

    await waitFor(() => {
      const dayItems = screen.getAllByText(/Clear sky/);
      const firstDayItem = dayItems[0].closest('.day-item');
      fireEvent.click(firstDayItem);
    });

    await waitFor(() => {
      const fileInput = screen.getByDisplayValue('') || document.querySelector('input[type="file"]');
      expect(fileInput).toBeInTheDocument();
      Object.defineProperty(fileInput, 'files', {
        value: [mockFile],
        writable: false,
      });
      fireEvent.change(fileInput);
    });

    expect(authAxiosInstance.post).toHaveBeenCalled();
  });

  it('should handle empty collections', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: [] } }),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('Saved Weather Collections')).toBeInTheDocument();
    });

    expect(screen.queryByText('New York Weather')).not.toBeInTheDocument();
  });

  it('should handle title save error', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn().mockRejectedValue(new Error('Save failed')),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const collectionItem = screen.getByText('New York Weather').closest('.collection-item');
    fireEvent.click(collectionItem);

    await waitFor(() => {
      const saveButton = screen.getByText('Save Title');
      fireEvent.click(saveButton);
    });

    await waitFor(() => {
      expect(screen.getByText('Failed to save title. Please try again.')).toBeInTheDocument();
    });
  });

  it('should display existing photos', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      expect(screen.getByText('New York Weather')).toBeInTheDocument();
    });

    const collectionItem = screen.getByText('New York Weather').closest('.collection-item');
    fireEvent.click(collectionItem);

    await waitFor(() => {
      const photos = screen.getAllByAltText(/Weather on/);
      expect(photos.length).toBeGreaterThan(0);
    });
  });

  it('should format dates correctly', async () => {
    const authAxiosInstance = {
      get: jest.fn().mockResolvedValue({ data: { collections: mockWeatherCollections } }),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    };
    axios.create.mockReturnValue(authAxiosInstance);

    render(<Create user={mockUser} />);
    
    await waitFor(() => {
      // Look for the formatted dates using flexible text matching
      const dateRanges = screen.getAllByText((content, element) => {
        return content.includes('Dec 31') && content.includes('Jan 6');
      });
      expect(dateRanges.length).toBeGreaterThan(0);
      
      const dateRanges2 = screen.getAllByText((content, element) => {
        return content.includes('Jan 9') && content.includes('Jan 16');
      });
      expect(dateRanges2.length).toBeGreaterThan(0);
    });
  });
}); 