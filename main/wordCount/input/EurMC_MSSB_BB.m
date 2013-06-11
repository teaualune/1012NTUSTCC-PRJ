function value = EurMC_MSSB_BB(S0, X, H, t, sigma, rr, r, N)
%EurMC_MSSB European put option by Monte Carlo simulation with multiple
%assets, single barrier and Brownian Bridge method.
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
%   Output:
%      value: the output payoff

% step 1. initialization

Nassets = length(S0); % number of assets

C = rr * (ones(Nassets) - eye(Nassets)) + eye(Nassets);
R = chol(C);

S = zeros(Nassets, N);

payoff = zeros(1, N);

% antithetic random variables
antithetic = zeros(Nassets, N);
for n = 1 : N/2
    antithetic(:, n) = R * randn(Nassets, 1);
    antithetic(:, N + 1 - n) = -antithetic(:, n);
end

% path generator.
% Z is the random number.
path = @(sigma, Z) exp((r - .5 * sigma.^2) * t + Z .* sigma * t^.5);

% step 2. loop through each path
for n = 1 : N

    % step 3. for each asset, calculated their final price
    S(:, n) = S0 .* path(sigma, antithetic(:, n)');

    % step 4. check for knock-out on first asset; if not knocked-out, add payoff
    if S(1, n) < H
        brownian = 1 - exp(-2 * log(H/S0(1)) * log(H/S(1,n)) / (sigma(1)*t));
        payoff(n) = max(X - mean(S(:, n)), 0) * brownian;
    end
end

% step 5. finalization
value = mean(payoff) * exp(r * t);

end
