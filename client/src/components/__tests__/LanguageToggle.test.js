import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { I18nextProvider } from 'react-i18next';
import i18n from 'i18next';
import LanguageToggle from '../LanguageToggle';

// Mock console.log and console.error
const mockConsoleLog = jest.spyOn(console, 'log').mockImplementation(() => {});
const mockConsoleError = jest.spyOn(console, 'error').mockImplementation(() => {});

// Create a test i18n instance
const createTestI18n = (currentLanguage = 'en') => {
  const testI18n = {
    language: currentLanguage,
    changeLanguage: jest.fn().mockResolvedValue({}),
    init: jest.fn(),
  };
  return testI18n;
};

// Mock react-i18next
const mockUseTranslation = jest.fn();
jest.mock('react-i18next', () => ({
  useTranslation: () => mockUseTranslation(),
  I18nextProvider: ({ children }) => children,
}));

describe('LanguageToggle Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockConsoleLog.mockClear();
    mockConsoleError.mockClear();
  });

  afterAll(() => {
    mockConsoleLog.mockRestore();
    mockConsoleError.mockRestore();
  });

  it('should render language toggle button with correct text for English', () => {
    const mockI18n = createTestI18n('en');
    mockUseTranslation.mockReturnValue({
      t: (key) => {
        const translations = {
          'common.language': 'Language',
          'common.english': 'English',
          'common.spanish': 'Spanish'
        };
        return translations[key] || key;
      },
      i18n: mockI18n
    });

    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Language: English');
    expect(button).toHaveAttribute('title', 'Switch to Spanish');
  });

  it('should render language toggle button with correct text for Spanish', () => {
    const mockI18n = createTestI18n('es');
    mockUseTranslation.mockReturnValue({
      t: (key) => {
        const translations = {
          'common.language': 'Idioma',
          'common.english': 'Inglés',
          'common.spanish': 'Español'
        };
        return translations[key] || key;
      },
      i18n: mockI18n
    });

    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    expect(button).toBeInTheDocument();
    expect(button).toHaveTextContent('Idioma: Español');
    expect(button).toHaveAttribute('title', 'Switch to English');
  });

  it('should toggle language from English to Spanish when clicked', async () => {
    const mockI18n = createTestI18n('en');
    mockUseTranslation.mockReturnValue({
      t: (key) => key,
      i18n: mockI18n
    });

    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('es');
      expect(mockConsoleLog).toHaveBeenCalledWith('Changing language to:', 'es');
    });
  });

  it('should toggle language from Spanish to English when clicked', async () => {
    const mockI18n = createTestI18n('es');
    mockUseTranslation.mockReturnValue({
      t: (key) => key,
      i18n: mockI18n
    });

    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('en');
      expect(mockConsoleLog).toHaveBeenCalledWith('Changing language to:', 'en');
    });
  });

  it('should handle language change errors gracefully', async () => {
    const mockI18n = createTestI18n('en');
    const error = new Error('Language change failed');
    
    // Mock the error to be thrown synchronously in the callback
    mockI18n.changeLanguage.mockImplementation(() => {
      throw error;
    });
    
    mockUseTranslation.mockReturnValue({
      t: (key) => key,
      i18n: mockI18n
    });

    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    // Give some time for the error to be caught and logged
    await waitFor(() => {
      expect(mockConsoleError).toHaveBeenCalledWith('Error changing language:', error);
    });
  });

  it('should handle language starting with "en-US" correctly', async () => {
    const mockI18n = createTestI18n('en-US');
    mockUseTranslation.mockReturnValue({
      t: (key) => key,
      i18n: mockI18n
    });

    render(<LanguageToggle />);
    
    const button = screen.getByRole('button');
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockI18n.changeLanguage).toHaveBeenCalledWith('es');
    });
  });
}); 