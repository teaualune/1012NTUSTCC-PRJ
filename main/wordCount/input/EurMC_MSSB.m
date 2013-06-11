function value = EurMC_MSSB(S0, X, H, t, sigma, rr, r, N, M)
%EurMC_MSSB European put option by Monte Carlo simulation with multiple
%assets and single barrier.
%   Inputs:
%      S0: initial assets; should be an 1-n dimentional array
%      X: strike price
%      H: high barrier on FIRST asset
%      t: year
%      sigma: volatilities for every assets; should be an 1-n dimentional
%      array whose length is equal to S
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

S = zeros(M+1, Nassets, N);
S(1, :, :) = repmat(S0, [1, 1, N]);

payoff = zeros(1, N);

% antithetic random variables
antithetic = zeros(M, Nassets, N);
for n = 1 : N/2
    antithetic(:, :, n) = randn(M, Nassets) * R;
    antithetic(:, :, N + 1 - n) = -antithetic(:, :, n);
end

% path generator.
% Z is the random number.
path = @(sigma, Z) exp((r - .5 * sigma.^2) * dt + Z .* sigma * dt^.5);

% step 2. loop through each path
for n = 1 : N

    % step 3. for each asset, generate their path
    S(2:M+1, :, n) = path(repmat(sigma, M, 1), antithetic(:, :, n));
    S(:, :, n) = cumprod(S(:, :, n));

    % step 4. check for knock-out on first asset; if not knocked-out, add payoff
    if any(S(:, 1, n) < H)
        payoff(n) = max(X - mean(S(M+1, :, n)), 0); % max(X - (S1 + S2 + S3)/3, 0)
    end
end

% step 5. finalization
value = mean(payoff) * exp(r * t);

end
