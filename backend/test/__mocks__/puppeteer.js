// Mock puppeteer for Jest test environment
module.exports = {
  launch: jest.fn().mockResolvedValue({
    newPage: jest.fn().mockResolvedValue({
      setContent: jest.fn(),
      pdf: jest.fn().mockResolvedValue(Buffer.from('mock-pdf')),
    }),
    close: jest.fn(),
  }),
};
