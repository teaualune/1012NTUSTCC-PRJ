function output = forwardRates(n, spotRates, maturities)
%FORWARDRATES Forward rates computation from spot rate curve.
%   Inputs:
%      n: number of spot rates, should be greater or equal than 1.
%      spotRates: spot rates (% per period). Should be a 1 x n matrix;
%                 additional entries given in the matrix will be ignored,
%                 and less entries given in the matrix will lead to error.
%      maturities: maturities of each spot rates. Should be a 1 x n integer
%                  matrix; additional entries given in the matrix will be
%                  ignored, and less entries given in the matrix will lead
%                  to error. The values need to be ascending and positive,
%                  i.e. maturities(i) < maturities(j) if i < j; and
%                  maturities(i) > 0 for all i; otherwise it will lead to
%                  error.
%   Outputs:
%      output: forward rates, a 1 x n matrix, where output(i)
%              stands for f(maturities(i-1), maturities(i)) ( % per rates;
%              assume maturities(0) = 0).
%              If n = 1 (one period)

% input checking
if (nargin ~= 3)
    error('incorrect number of inputs.');
end
if (n < 1)
    error('n should be greater or equal than 1.');
end
if (length(spotRates) < n)
    error('no enough entries for spot rates.');
end
if (length(maturities) < n)
    error('no enough entries for maturities.');
elseif (sum(maturities > 0) < n)
    error('all entries in maturities should be positive.');
end

sizeOfSpotRates = size(spotRates);
if (sizeOfSpotRates(1) ~= 1)
    spotRates = spotRates';
end
spotRates = [0, spotRates];

sizeOfMaturities = size(maturities);
if (sizeOfMaturities(1) ~= 1)
    maturities = maturities';
end
maturities = [0, maturities];

output = zeros(1, n);

for m = 1:n
    i = maturities(m);
    j = maturities(m + 1);
    output(m) = ((1 + spotRates(m+1))^j / (1 + spotRates(m))^i)^(1/(j-i)) - 1;
end

end

