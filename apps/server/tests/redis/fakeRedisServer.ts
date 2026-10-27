import net from "node:net";
import type { AddressInfo } from "node:net";

/**
 * A TCP server that speaks just enough RESP to stand in for a misbehaving Redis:
 * - `stall`: completes node-redis's connection handshake (CLIENT SETINFO, SELECT, …) and then
 *   never answers a command, like a connected Redis stuck in an AOF rewrite fork;
 * - `silent`: accepts the connection and answers nothing, not even the handshake;
 * - `wrongpass`: answers every command with the error Redis gives a bad password.
 */
export type FakeRedisMode = "stall" | "silent" | "wrongpass";

const HANDSHAKE = new Set(["CLIENT", "SELECT", "HELLO", "AUTH", "PING"]);

/** Splits complete RESP arrays off the buffer; returns the command names and the rest. */
function readCommands(buffer: string): { names: string[]; rest: string } {
  const names: string[] = [];
  let rest = buffer;

  for (;;) {
    const match = /^\*(\d+)\r\n/.exec(rest);
    if (!match) break;
    let offset = match[0].length;
    const args: string[] = [];
    let complete = true;

    for (let i = 0; i < Number(match[1]); i += 1) {
      const header = /^\$(\d+)\r\n/.exec(rest.slice(offset));
      if (!header) {
        complete = false;
        break;
      }
      const start = offset + header[0].length;
      const end = start + Number(header[1]);
      if (rest.length < end + 2) {
        complete = false;
        break;
      }
      args.push(rest.slice(start, end));
      offset = end + 2;
    }

    if (!complete) break;
    names.push((args[0] ?? "").toUpperCase());
    rest = rest.slice(offset);
  }

  return { names, rest };
}

export async function startFakeRedis(mode: FakeRedisMode) {
  const sockets = new Set<net.Socket>();
  const server = net.createServer((socket) => {
    sockets.add(socket);
    socket.on("close", () => sockets.delete(socket));
    socket.on("error", () => undefined);
    let buffer = "";

    socket.on("data", (chunk) => {
      const { names, rest } = readCommands(buffer + chunk.toString("latin1"));
      buffer = rest;
      for (const name of names) {
        if (mode === "wrongpass") {
          socket.write("-WRONGPASS invalid username-password pair or user is disabled.\r\n");
        } else if (mode === "stall" && HANDSHAKE.has(name)) {
          socket.write("+OK\r\n");
        }
        // Anything else is never answered.
      }
    });
  });

  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;

  return {
    url: `redis://${mode === "wrongpass" ? "default:wrong@" : ""}127.0.0.1:${port}/14`,
    async close() {
      for (const socket of sockets) socket.destroy();
      await new Promise((resolve) => server.close(resolve));
    },
  };
}

/** A loopback port nothing listens on: every connection attempt is refused. */
export async function unusedPort(): Promise<number> {
  const server = net.createServer();
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
  const { port } = server.address() as AddressInfo;
  await new Promise((resolve) => server.close(resolve));
  return port;
}
