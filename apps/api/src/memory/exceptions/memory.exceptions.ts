import { BadGatewayException, ForbiddenException } from '@nestjs/common';
import { MemoryProvider } from '@app-starter/shared';

export class MemoryAccessDeniedException extends ForbiddenException {
  constructor(action: string) {
    super(`You do not have permission to ${action} memories in this organization`);
  }
}

/**
 * The upstream provider failed or could not be reached. The upstream status is
 * kept in the message for logs but never forwarded as our own status, so a
 * provider's 401 is not mistaken for the caller's session expiring.
 */
export class MemoryProviderUnavailableException extends BadGatewayException {
  constructor(provider: MemoryProvider, upstreamStatus?: number) {
    const detail = upstreamStatus ? ` (upstream status ${upstreamStatus})` : '';
    super(`Memory provider "${provider}" is unavailable${detail}`);
  }
}
