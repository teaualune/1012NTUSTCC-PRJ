function EurMC_MSSB_BBTest(N, paths)
%EURMC_MSSB_BBTEST Test and evaluation to EurMC_MSSB_BB. The inputs of the
%function comes from the homework requirement.
%   Inputs:
%      N: number of evaluations
%      paths: number of simulated paths

value = zeros(1, N);

for i = 1 : N
    value(i) = EurMC_MSSB_BB([50,50,50], 50, 80, 1, [.3,.3,.3], .4, .06, paths);
end

fprintf('Average result: %f\nStandard deviation: %f\n', mean(value), std(value));

end