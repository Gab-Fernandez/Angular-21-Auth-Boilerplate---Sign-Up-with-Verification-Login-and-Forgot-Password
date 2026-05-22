import { catchError, of, timeout } from "rxjs";

import { AccountService } from '@app/_services';

export function appInitializer(accountService: AccountService) {
    return () => accountService.refreshToken()
        .pipe(
            timeout(5000),
            catchError(() => of())
        );
}