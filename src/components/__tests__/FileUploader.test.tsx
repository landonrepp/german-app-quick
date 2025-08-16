import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React from 'react';
import FileUploader from '../FileUploader';

function createFile(name: string, type: string, content: string) {
  return new File([content], name, { type });
}

describe('FileUploader', () => {
  test('accepts only text/plain and reads content', async () => {
    render(<FileUploader />);

    const input = screen.getByLabelText(/choose a file/i) as HTMLInputElement;

    // Ensure File.text() resolves in jsdom
    const originalText = (File.prototype as any).text;
    Object.defineProperty(File.prototype, 'text', {
      configurable: true,
      value: jest.fn().mockResolvedValue('hello world'),
    });

    const file = createFile('sample.txt', 'text/plain', 'hello world');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText('hello world')).toBeInTheDocument());

    // restore
    if (originalText === undefined) {
      delete (File.prototype as any).text;
    } else {
      Object.defineProperty(File.prototype, 'text', { configurable: true, value: originalText });
    }
  });

  test('rejects non-text files and shows an error', async () => {
    render(<FileUploader />);
    const input = screen.getByLabelText(/choose a file/i) as HTMLInputElement;
    const file = createFile('image.png', 'image/png', 'fake');

    fireEvent.change(input, { target: { files: [file] } });

    await waitFor(() => expect(screen.getByText(/only text files/i)).toBeInTheDocument());
  });
});
