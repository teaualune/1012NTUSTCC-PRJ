function EurMC_MSSBTest(N, paths, step)
%EURMC_MSSBTEST Test and evaluation to EurMC_MSSB. The inputs of the
%function comes from the homework requirement.
%   Inputs:
%      N: number of evaluations
%      paths: number of simulated paths
%      step: number of time points including today

value = zeros(1, N);

for i = 1 : N
    value(i) = EurMC_MSSB([50,50,50], 50, 80, 1, [.3,.3,.3], .4, .06, paths, step);
end

fprintf('Average result: %f\nStandard deviation: %f\n', mean(value), std(value));

end