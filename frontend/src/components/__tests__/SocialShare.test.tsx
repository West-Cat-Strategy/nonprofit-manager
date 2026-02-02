import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import SocialShare from '../SocialShare';

// Mock navigator.clipboard and navigator.share
const mockClipboard = {
  writeText: jest.fn(),
};

const mockShare = jest.fn();

Object.assign(navigator, {
  clipboard: mockClipboard,
  share: mockShare,
});

describe('SocialShare', () => {
  const mockData = {
    url: '/events/event-123',
    title: 'Annual Fundraiser Gala',
    description: 'Join us for our annual fundraising event',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockClipboard.writeText.mockResolvedValue(undefined);
    mockShare.mockResolvedValue(undefined);
    // Reset navigator.share for each test
    Object.defineProperty(navigator, 'share', {
      value: undefined,
      configurable: true,
      writable: true,
    });
  });

  afterEach(() => {
    jest.restoreAllMocks();
  });

  it('should render the share button with label', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    expect(button).toBeInTheDocument();
  });

  it('should render without label when showLabel is false', () => {
    render(<SocialShare data={mockData} showLabel={false} />);

    const button = screen.getByRole('button');
    expect(button).not.toHaveTextContent('Share');
  });

  it('should not show dropdown initially', () => {
    render(<SocialShare data={mockData} />);

    expect(screen.queryByText('Facebook')).not.toBeInTheDocument();
    expect(screen.queryByText('Twitter')).not.toBeInTheDocument();
  });

  it('should open dropdown when button is clicked', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    expect(screen.getByText('Facebook')).toBeInTheDocument();
    expect(screen.getByText('Twitter')).toBeInTheDocument();
    expect(screen.getByText('LinkedIn')).toBeInTheDocument();
    expect(screen.getByText('Email')).toBeInTheDocument();
    expect(screen.getByText('Copy Link')).toBeInTheDocument();
  });

  it('should close dropdown when button is clicked again', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });

    // Open
    fireEvent.click(button);
    expect(screen.getByText('Facebook')).toBeInTheDocument();

    // Close
    fireEvent.click(button);
    expect(screen.queryByText('Facebook')).not.toBeInTheDocument();
  });

  it('should close dropdown when clicking outside', async () => {
    render(<SocialShare data={mockData} />);

    // Open dropdown
    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    // Click outside
    fireEvent.mouseDown(document.body);

    await waitFor(() => {
      expect(screen.queryByText('Facebook')).not.toBeInTheDocument();
    });
  });

  it('should generate correct Facebook share URL', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const facebookLink = screen.getByText('Facebook').closest('a');
    const expectedUrl = window.location.origin + mockData.url;

    expect(facebookLink).toHaveAttribute('href', expect.stringContaining('facebook.com/sharer/sharer.php'));
    expect(facebookLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(expectedUrl)));
  });

  it('should generate correct Twitter share URL', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const twitterLink = screen.getByText('Twitter').closest('a');
    expect(twitterLink).toHaveAttribute('href', expect.stringContaining('twitter.com/intent/tweet'));
    expect(twitterLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(mockData.title)));
  });

  it('should generate correct LinkedIn share URL', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const linkedinLink = screen.getByText('LinkedIn').closest('a');
    expect(linkedinLink).toHaveAttribute('href', expect.stringContaining('linkedin.com/sharing/share-offsite'));
  });

  it('should generate correct Email share URL', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const emailLink = screen.getByText('Email').closest('a');
    expect(emailLink).toHaveAttribute('href', expect.stringContaining('mailto:'));
    expect(emailLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(mockData.title)));
    expect(emailLink).toHaveAttribute('target', '_self');
  });

  it('should open social links in new tab except email', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const facebookLink = screen.getByText('Facebook').closest('a');
    const twitterLink = screen.getByText('Twitter').closest('a');
    const linkedinLink = screen.getByText('LinkedIn').closest('a');
    const emailLink = screen.getByText('Email').closest('a');

    expect(facebookLink).toHaveAttribute('target', '_blank');
    expect(twitterLink).toHaveAttribute('target', '_blank');
    expect(linkedinLink).toHaveAttribute('target', '_blank');
    expect(emailLink).toHaveAttribute('target', '_self');
  });

  it('should copy link to clipboard when Copy Link is clicked', async () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(mockClipboard.writeText).toHaveBeenCalledWith(window.location.origin + mockData.url);
    });
  });

  it('should show "Copied!" message after copying', async () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should reset "Copied!" message after 2 seconds', async () => {
    jest.useFakeTimers();

    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });

    jest.advanceTimersByTime(2000);

    await waitFor(() => {
      expect(screen.getByText('Copy Link')).toBeInTheDocument();
      expect(screen.queryByText('Copied!')).not.toBeInTheDocument();
    });

    jest.useRealTimers();
  });

  it('should handle clipboard API failure with fallback', async () => {
    mockClipboard.writeText.mockRejectedValue(new Error('Clipboard API not available'));

    // Mock document.execCommand
    document.execCommand = jest.fn(() => true);

    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const copyButton = screen.getByText('Copy Link');
    fireEvent.click(copyButton);

    await waitFor(() => {
      expect(document.execCommand).toHaveBeenCalledWith('copy');
      expect(screen.getByText('Copied!')).toBeInTheDocument();
    });
  });

  it('should use native share API when available', async () => {
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    await waitFor(() => {
      expect(mockShare).toHaveBeenCalledWith({
        title: mockData.title,
        text: mockData.description,
        url: window.location.origin + mockData.url,
      });
    });

    // Dropdown should not be shown
    expect(screen.queryByText('Facebook')).not.toBeInTheDocument();
  });

  it('should handle native share cancellation gracefully', async () => {
    mockShare.mockRejectedValue(new Error('User cancelled'));

    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    
    // Should not throw
    expect(() => fireEvent.click(button)).not.toThrow();
  });

  it('should handle absolute URLs', () => {
    const absoluteData = {
      url: 'https://example.com/events/event-123',
      title: 'Event',
    };

    render(<SocialShare data={absoluteData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const facebookLink = screen.getByText('Facebook').closest('a');
    expect(facebookLink).toHaveAttribute('href', expect.stringContaining(encodeURIComponent(absoluteData.url)));
  });

  it('should handle missing description', () => {
    const dataWithoutDesc = {
      url: '/event',
      title: 'Event',
    };

    render(<SocialShare data={dataWithoutDesc} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    expect(screen.getByText('Email')).toBeInTheDocument();
  });

  it('should apply custom className', () => {
    const { container } = render(<SocialShare data={mockData} className="custom-class" />);

    const wrapper = container.querySelector('.custom-class');
    expect(wrapper).toBeInTheDocument();
  });

  it('should close dropdown when share option is clicked', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const facebookLink = screen.getByText('Facebook');
    fireEvent.click(facebookLink);

    expect(screen.queryByText('Facebook')).not.toBeInTheDocument();
  });

  it('should cleanup event listener on unmount', () => {
    const removeEventListenerSpy = jest.spyOn(document, 'removeEventListener');

    const { unmount } = render(<SocialShare data={mockData} />);

    unmount();

    expect(removeEventListenerSpy).toHaveBeenCalledWith('mousedown', expect.any(Function));

    removeEventListenerSpy.mockRestore();
  });

  it('should render share icon', () => {
    const { container } = render(<SocialShare data={mockData} />);

    const shareIcon = container.querySelector('svg.w-5.h-5');
    expect(shareIcon).toBeInTheDocument();
  });

  it('should rotate chevron when dropdown is open and native share not available', () => {
    const { container } = render(<SocialShare data={mockData} />);

    const chevron = container.querySelectorAll('svg.w-4.h-4.transition-transform')[0];

    // Initially not rotated
    expect(chevron).not.toHaveClass('rotate-180');

    // Open dropdown
    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    // Should be rotated
    expect(chevron).toHaveClass('rotate-180');
  });

  it('should not show chevron when native share is available', () => {
    Object.defineProperty(navigator, 'share', {
      value: mockShare,
      configurable: true,
      writable: true,
    });

    const { container } = render(<SocialShare data={mockData} />);

    const chevron = container.querySelector('svg.w-4.h-4.transition-transform');
    
    // Chevron should not be rendered
    expect(chevron).toBeNull();
  });

  it('should render dropdown with correct z-index', () => {
    render(<SocialShare data={mockData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const dropdown = screen.getByText('Facebook').closest('div');
    expect(dropdown).toHaveClass('z-50');
  });

  it('should encode special characters in URL parameters', () => {
    const specialData = {
      url: '/event?id=123&name=test',
      title: 'Test & Event',
      description: 'With special chars: !@#$%',
    };

    render(<SocialShare data={specialData} />);

    const button = screen.getByRole('button', { name: /share/i });
    fireEvent.click(button);

    const twitterLink = screen.getByText('Twitter').closest('a');
    expect(twitterLink?.href).toContain('%26'); // Encoded ampersand
  });
});
