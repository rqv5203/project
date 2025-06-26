import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import axios from 'axios';
import WeatherSearch from '../WeatherSearch';

// Mock axios
jest.mock('axios', () => ({
  __esModule: true,
  default: {
    create: jest.fn(() => ({
      get: jest.fn(),
      put: jest.fn(),
      delete: jest.fn(),
      post: jest.fn()
    })),
    get: jest.fn()
  }
}));

// Mock react-i18next
jest.mock('react-i18next', () => ({
  useTranslation: () => ({
    t: (key) => {
      const translations = {
        'common.loading': 'Loading...',
        'weather.searchLocation': 'Search for a location',
        'weather.search': 'Search',
        'weather.save': 'Save Collection',
        'weather.currentLocation': 'Use Current Location',
        'weather.enterLocation': 'Enter a location...',
        'weather.or': 'or',
        'weather.location': 'Location',
        'weather.forecast': 'Forecast',
        'weather.noData': 'No weather data available.',
        'common.search': 'Search',
        'weather.feelsLike': 'Feels like',
        'weather.precipitation': 'Precipitation',
        'weather.wind': 'Wind',
        'weather.humidity': 'Humidity',
        'weather.cloudCover': 'Cloud Cover',
        'weather.sevenDayForecast': '7-Day Forecast',
        'weather.historicalData': 'Historical Data',
        'weather.startDate': 'Start Date',
        'weather.endDate': 'End Date',
        'weather.fetchHistorical': 'Fetch Historical Data'
      };
      return translations[key] || key;
    },
  }),
}));

const mockUser = {
  email: 'test@example.com',
  token: 'test-token'
};

// Mock geolocation
const mockGeolocation = {
  getCurrentPosition: jest.fn(),
  watchPosition: jest.fn()
};

Object.defineProperty(global.navigator, 'geolocation', {
  value: mockGeolocation,
  writable: true
});

const mockWeatherData = {
  current: {
    temperature_2m: 20,
    apparent_temperature: 22,
    relative_humidity_2m: 65,
    weather_code: 0,
    wind_speed_10m: 15,
    cloud_cover: 25,
    precipitation: 0
  },
  daily: {
    time: ['2023-01-01', '2023-01-02'],
    weather_code: [0, 1],
    temperature_2m_max: [20, 22],
    temperature_2m_min: [15, 17],
    precipitation_sum: [0, 1.2],
    wind_speed_10m_max: [18, 22]
  }
};

const mockGeocodingData = {
  results: [{
    latitude: 40.7128,
    longitude: -74.0060,
    name: 'New York',
    admin1: 'New York',
    country: 'United States'
  }]
};

describe('WeatherSearch Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should render search form initially', () => {
    render(<WeatherSearch user={mockUser} />);
    
    expect(screen.getByPlaceholderText('Search for a location...')).toBeInTheDocument();
    expect(screen.getByText('Search')).toBeInTheDocument();
    expect(screen.getByText(/°C → °F|°F → °C/)).toBeInTheDocument();
  });

  it('should handle location search successfully', async () => {
    // Mock geocoding API call
    axios.get.mockImplementation((url) => {
      if (url.includes('geocoding-api.open-meteo.com')) {
        return Promise.resolve({ data: mockGeocodingData });
      }
      // Mock weather API call
      return Promise.resolve({ data: mockWeatherData });
    });

    render(<WeatherSearch user={mockUser} />);
    
    const locationInput = screen.getByPlaceholderText('Search for a location...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(locationInput, { target: { value: 'New York' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(axios.get).toHaveBeenCalledTimes(2); // One for geocoding, one for weather
    });
  });

  it('should display error when location not found', async () => {
    axios.get.mockResolvedValue({ data: { results: [] } });

    render(<WeatherSearch user={mockUser} />);
    
    const locationInput = screen.getByPlaceholderText('Search for a location...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(locationInput, { target: { value: 'NonexistentPlace' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Location not found. Please try a different search term.')).toBeInTheDocument();
    });
  });

  it('should get current location when useEffect runs', async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success) => {
      success({
        coords: {
          latitude: 40.7128,
          longitude: -74.0060
        }
      });
    });

    // Mock the axios call that would be made after getting location
    axios.get.mockResolvedValue({ data: mockWeatherData });

    render(<WeatherSearch user={mockUser} />);
    
    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });

  it('should handle geolocation error', async () => {
    mockGeolocation.getCurrentPosition.mockImplementationOnce((success, error) => {
      error({ code: 1, message: 'Permission denied' });
    });

    render(<WeatherSearch user={mockUser} />);
    
    await waitFor(() => {
      expect(mockGeolocation.getCurrentPosition).toHaveBeenCalled();
    });
  });

  it('should handle search error', async () => {
    axios.get.mockRejectedValue(new Error('API Error'));

    render(<WeatherSearch user={mockUser} />);
    
    const locationInput = screen.getByPlaceholderText('Search for a location...');
    const searchButton = screen.getByText('Search');

    fireEvent.change(locationInput, { target: { value: 'Invalid Location' } });
    fireEvent.click(searchButton);

    await waitFor(() => {
      expect(screen.getByText('Failed to search for location. Please try again.')).toBeInTheDocument();
    });
  });

  it('should handle empty search input', () => {
    render(<WeatherSearch user={mockUser} />);
    
    const locationInput = screen.getByPlaceholderText('Search for a location...');
    const searchButton = screen.getByText('Search');

    fireEvent.click(searchButton);

    // Component should handle empty input gracefully - no API calls should be made
    expect(axios.get).not.toHaveBeenCalled();
  });

  it('should toggle temperature units', () => {
    render(<WeatherSearch user={mockUser} />);
    
    const toggleButton = screen.getByText('°C → °F');
    expect(toggleButton).toBeInTheDocument();
    
    fireEvent.click(toggleButton);
    
    expect(screen.getByText('°F → °C')).toBeInTheDocument();
  });
}); 