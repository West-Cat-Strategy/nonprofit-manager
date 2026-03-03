import type {
  Account,
  CreateAccountDTO,
  UpdateAccountDTO,
} from '@app-types/account';
import type { AccountLifecyclePort } from '../types/ports';

export class AccountLifecycleUseCase {
  constructor(private readonly repository: AccountLifecyclePort) {}

  create(payload: CreateAccountDTO, userId: string): Promise<Account> {
    return this.repository.createAccount(payload, userId);
  }

  update(accountId: string, payload: UpdateAccountDTO, userId: string): Promise<Account | null> {
    return this.repository.updateAccount(accountId, payload, userId);
  }

  delete(accountId: string, userId: string): Promise<boolean> {
    return this.repository.deleteAccount(accountId, userId);
  }
}
