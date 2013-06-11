function value = EurMC_MSSB_old(S0, X, H, t, sigma, rr, r, N, M)
%EurMC_MSSB_OLD European put option by Monte Carlo simulation with multiple
%assets and single barrier.
%   Inputs:
%      S0: initial assets; should be an 1-dimentional array
%      X: strike price
%      H: high barrier on FIRST asset
%      t: year
%      sigma: volatilities for every assets; should be an 1-dimentional array
%      whose length is equal to S
%      rr: correlations between any two assets (in %)
%      r: interest rate (in %)
%      N: number of paths
%      M: number of time points including today
%   Output:
%      value: the output payoff

% step 1. initialization

Nassets = length(S0); % number of assets
dt = t / (M+1);

C = rr * (ones(Nassets) - eye(Nassets)) + eye(Nassets);
R = chol(C);

S = zeros(M+1, N, Nassets);
payoff = zeros(1, N);

% antithetic random variables
antithetic = S;
for n = 1 : N/2
    antithetic(:, n, :) = randn(M+1, Nassets) * R;
    antithetic(:, N + 1 - n, :) = -antithetic(:, n, :);
end

% path generator.
% Z is the random number.
path = @(sigma, Z) exp((r-.5*sigma^2)*dt + Z*sigma*dt^.5);

% step 2. loop through each path
for n = 1 : N

    % step 3. loop through each asset
    for asset = 1 : Nassets

        % step 4. generate this asset's path
        S(1, n, asset) = S0(asset);
        for m = 2 : M+1
            S(m, n, asset) = S(m-1, n, asset) * path(sigma(asset), antithetic(m, n, asset));
        end
        if asset == 1
            % step 5. check for knock-out
            knockedOut = any(S(:, n, 1) >= H);
        end
    end
    % step 6. if not knocked out, add payoff
    if knockedOut == 0
        payoff(n) = max(X - mean(S(M+1, n, :)), 0); % max(X - (S1 + S2 + S3)/3, 0)
    end
end

% step 6. finalization

value = mean(payoff) * exp(r * t);

end