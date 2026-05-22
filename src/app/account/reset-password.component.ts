import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { first, timeout, catchError } from 'rxjs/operators';
import { of } from 'rxjs';
import { AccountService, AlertService } from '@app/_services';
import { MustMatch } from '@app/_helpers';

enum TokenStatus {
    Validating,
    Valid,
    Invalid
}

@Component({ templateUrl: 'reset-password.component.html', standalone: false })
export class ResetPasswordComponent implements OnInit {
    TokenStatus = TokenStatus;
    tokenStatus = TokenStatus.Validating;
    status = 'validating';
    token?: string;
    form!: FormGroup;
    loading = false;
    submitted = false;

    constructor(
        private formBuilder: FormBuilder,
        private route: ActivatedRoute,
        private router: Router,
        private accountService: AccountService,
        private alertService: AlertService,
        private cd: ChangeDetectorRef
    ) {}

    ngOnInit() {
        this.form = this.formBuilder.group({
            password: ['', [Validators.required, Validators.minLength(6)]],
            confirmPassword: ['', Validators.required],
        }, {
            validator: MustMatch('password', 'confirmPassword')
        });

        let token = this.route.snapshot.queryParams['token'] 
                 || this.route.snapshot.queryParams['Token'];

        if (!token) {
            this.tokenStatus = TokenStatus.Invalid;
            this.status = 'invalid';
            return;
        }

        token = token.replace(/ /g, '+');

        this.accountService.validateResetToken(token)
            .pipe(
                timeout(30000),
                first(),
                catchError(error => {
                    console.error('Token validation failed:', error);
                    this.status = 'invalid';
                    this.tokenStatus = TokenStatus.Invalid;
                    this.cd.detectChanges();
                    return of(null);
                })
            )
            .subscribe(result => {
                if (result !== null) {
                    this.token = token;
                    this.status = 'valid';
                    this.tokenStatus = TokenStatus.Valid;
                } else {
                    this.status = 'invalid';
                    this.tokenStatus = TokenStatus.Invalid;
                }
                this.router.navigate([], { relativeTo: this.route, replaceUrl: true });
                this.cd.detectChanges();
            });
    }

    get f() { return this.form.controls; }

    onSubmit() {
        this.submitted = true;
        this.alertService.clear();
        if (this.form.invalid) return;
        this.loading = true;
        this.accountService.resetPassword(this.token!, this.f.password.value, this.f.confirmPassword.value)
            .pipe(first())
            .subscribe({
                next: () => {
                    this.alertService.success('Password reset successful, you can now login', { keepAfterRouteChange: true });
                    this.router.navigate(['../login'], { relativeTo: this.route });
                },
                error: error => {
                    this.alertService.error(error);
                    this.loading = false;
                }
            });
    }
}