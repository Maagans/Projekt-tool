import { describe, it, expect, vi, beforeEach, beforeAll } from "vitest";

const queryMock = vi.fn();
const releaseMock = vi.fn();
const connectMock = vi.fn(async () => ({
  query: queryMock,
  release: releaseMock,
}));

vi.mock("../../db.js", () => ({
  default: {
    connect: connectMock,
  },
}));

const loggerErrorMock = vi.fn();
vi.mock("../../logger.js", () => ({
  default: {
    error: loggerErrorMock,
  },
}));

let withTransaction;

beforeAll(async () => {
  ({ withTransaction } = await import("../../utils/transactions.js"));
});

beforeEach(() => {
  queryMock.mockReset();
  releaseMock.mockReset();
  connectMock.mockReset();
  connectMock.mockResolvedValue({ query: queryMock, release: releaseMock });
  loggerErrorMock.mockReset();
});

describe("withTransaction", () => {
  it("commits and releases the client on success", async () => {
    queryMock.mockResolvedValue(undefined);

    const result = await withTransaction(async (client) => {
      expect(client.query).toBe(queryMock);
      await client.query('SELECT 1');
      return 'ok';
    });

    expect(result).toBe('ok');
    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(queryMock).toHaveBeenNthCalledWith(2, 'SELECT 1');
    expect(queryMock).toHaveBeenNthCalledWith(3, 'COMMIT');
    expect(releaseMock).toHaveBeenCalledOnce();
    expect(loggerErrorMock).not.toHaveBeenCalled();
  });

  it("rolls back and rethrows on failure", async () => {
    queryMock.mockResolvedValue(undefined);
    const failure = new Error('boom');

    await expect(withTransaction(async () => {
      throw failure;
    })).rejects.toThrow(failure);

    expect(queryMock).toHaveBeenNthCalledWith(1, 'BEGIN');
    expect(queryMock).toHaveBeenNthCalledWith(2, 'ROLLBACK');
    expect(releaseMock).toHaveBeenCalledOnce();
  });
});
