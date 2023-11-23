pragma solidity 0.8.20;

import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import '@uniswap/v3-core/contracts/interfaces/IERC20Minimal.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
///import '@uniswap/v3-periphery/contracts/base/Multicall.sol';

import "./interfaces/IStaker.sol";

import "./libraries/IncentiveId.sol";

import "./libraries/TransferHelperExtended.sol";
import "./libraries/RewardMath.sol";
import "./libraries/NFTPositionInfo.sol";

contract Staker is IStaker {

    struct Incentive {
        uint256 totalRewardUnclaimed;
        uint160 totalSecondsClaimedX128;
        uint96 numberOfStakes;
    }

    struct Deposit {
        address owner;
        uint48 numberOfStakes;
        int24 tickLower;
        int24 tickUpper;
    }

    struct Stake {
        uint160 secondsPerLiquidityInsideInitialX128;
        uint96 liquidityNoOverflow;
        uint128 liquidityIfOverflow;
    }

    address WETH = 0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2; 

    address MIMIS;
    address MIMISWETH;

    address VITA = 0x81f8f0bb1cB2A06649E51913A151F0E7Ef6FA321;
    address VITAWETH = 0xcBcC3cBaD991eC59204be2963b4a87951E4d292B;

    //address ATH = 0xa4ffdf3208f46898ce063e25c1c43056fa754739;

    address HAIR = 0x9Ce115f0341ae5daBC8B477b74E83db2018A6f42;
    address HAIRWETH = 0x94DD312F6Cb52C870aACfEEb8bf5E4e28F6952ff;

    address GROW = 0x761A3557184cbC07b7493da0661c41177b2f97fA;
    address GROWWETH = 0x61847189477150832D658D8f34f84c603Ac269af;

    address LAKE =  0xF9Ca9523E5b5A42C3018C62B084Db8543478C400;
    address LAKEWETH = 0xeFd69F1FF464Ed673dab856c5b9bCA4D2847a74f;

    address RSC = 0xD101dCC414F310268c37eEb4cD376CcFA507F571;
    address RSCWETH = 0xeC2061372a02D5e416F5D8905eea64Cab2c10970;
    IUniswapV3Factory public factory = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);

    INonfungiblePositionManager public nfpm = INonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

    address[] public tokenArray = [RSC, LAKE, GROW, HAIR, VITA, WETH];
    mapping(address => IncentiveKey) public incentiveKeys;
    mapping(bytes32 => Incentive) public  incentives;
    bytes32[] public incentiveIds;


    mapping(uint256 => Deposit) public  deposits;

    mapping(uint256 => mapping(bytes32 => Stake)) private _stakes;

    function stakes(uint256 tokenId, bytes32 incentiveId)
        public
        view
        returns (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity)
    {
        Stake storage stake = _stakes[tokenId][incentiveId];
        secondsPerLiquidityInsideInitialX128 = stake.secondsPerLiquidityInsideInitialX128;
        liquidity = stake.liquidityNoOverflow;
        if (liquidity == type(uint96).max) {
            liquidity = stake.liquidityIfOverflow;
        }
    }
    
    mapping(IERC20Minimal => mapping(address => uint256)) public  rewards;
    address owner;

    constructor (
        address mimis,
        address mimisWeth
    ) {
        MIMIS = mimis;
        MIMISWETH = mimisWeth; 
        owner = msg.sender;
        {
        uint256 fiveYears = 5 * 365 * 24 * 3600;

        IncentiveKey memory rscKey = IncentiveKey(
            IERC20Minimal(RSC), IUniswapV3Pool(MIMISWETH), block.timestamp, block.timestamp + fiveYears, owner
        );
        Incentive memory rscIncentive = Incentive(0,0,0);
        bytes32 rscIncentiveId = IncentiveId.compute(rscKey);
        incentives[rscIncentiveId]  = rscIncentive;
        incentiveKeys[RSC]= rscKey;
        incentiveIds.push(rscIncentiveId);

        IncentiveKey memory growKey = IncentiveKey(
            IERC20Minimal(GROW), IUniswapV3Pool(MIMISWETH), block.timestamp, block.timestamp + fiveYears, owner
        );
        Incentive memory growIncentive = Incentive(0,0,0);
        bytes32 growIncentiveId = IncentiveId.compute(growKey);
        incentives[growIncentiveId]  = growIncentive;
        incentiveKeys[GROW] = growKey;
        incentiveIds.push(growIncentiveId);
        }
       { 
        uint256 fiveYears = 5 * 365 * 24 * 3600;
        IncentiveKey memory hairKey = IncentiveKey(
            IERC20Minimal(HAIR), IUniswapV3Pool(MIMISWETH), block.timestamp, block.timestamp + fiveYears, owner
        );
        Incentive memory hairIncentive = Incentive(0,0,0);
        bytes32 hairIncentiveId = IncentiveId.compute(hairKey);
        incentives[hairIncentiveId]  = hairIncentive;
        incentiveKeys[HAIR] = hairKey;
        incentiveIds.push(hairIncentiveId);

        IncentiveKey memory vitaKey = IncentiveKey(
            IERC20Minimal(VITA), IUniswapV3Pool(MIMISWETH), block.timestamp, block.timestamp + fiveYears, owner
        );
        Incentive memory vitaIncentive = Incentive(0,0,0);
        bytes32 vitaIncentiveId = IncentiveId.compute(vitaKey);
        incentives[vitaIncentiveId]  = vitaIncentive;
        incentiveKeys[VITA] = vitaKey;
        incentiveIds.push(vitaIncentiveId);

        IncentiveKey memory lakeKey = IncentiveKey(
            IERC20Minimal(LAKE), IUniswapV3Pool(MIMISWETH), block.timestamp, block.timestamp + fiveYears, owner
        );
        Incentive memory lakeIncentive = Incentive(0,0,0);
        bytes32 lakeIncentiveId = IncentiveId.compute(lakeKey);
        incentives[lakeIncentiveId]  = lakeIncentive;
        incentiveKeys[LAKE] = lakeKey;
        incentiveIds.push(lakeIncentiveId);
        
        IncentiveKey memory wethKey = IncentiveKey(
            IERC20Minimal(WETH), IUniswapV3Pool(MIMISWETH), block.timestamp, block.timestamp + fiveYears, owner
        );

        Incentive memory wethIncentive = Incentive(0,0,0);
        bytes32 wethIncentiveId = IncentiveId.compute(wethKey);
        incentives[wethIncentiveId]  = wethIncentive;
        incentiveKeys[WETH] = wethKey;
        incentiveIds.push(wethIncentiveId);
       }
    }

    function createIncentive(IncentiveKey memory key, uint256 initialReward) external override {
        require(msg.sender == owner, 'UniswapV3Staker::createIncentive: not owner');
        //require(reward > 0, 'UniswapV3Staker::createIncentive: reward must be positive');
        require(
            block.timestamp <= key.startTime,
            'UniswapV3Staker::createIncentive: start time must be now or in the future'
        );
        /*
        require(
            key.startTime - block.timestamp <= maxIncentiveStartLeadTime,
            'UniswapV3Staker::createIncentive: start time too far into future'
        );
        */
        require(key.startTime < key.endTime, 'UniswapV3Staker::createIncentive: start time must be before end time');
        
        /*
        require(
            key.endTime - key.startTime <= maxIncentiveDuration,
            'UniswapV3Staker::createIncentive: incentive duration is too long'
        );
        */
        bytes32 incentiveId = IncentiveId.compute(key);

        incentives[incentiveId].totalRewardUnclaimed += initialReward;

        //TransferHelperExtended.safeTransferFrom(address(key.rewardToken), msg.sender, address(this), reward);

        emit IncentiveCreated(key.rewardToken, key.pool, key.startTime, key.endTime, key.refundee, initialReward);
    }

    function fundIncentive(address token, uint256 amount) external {
        require(msg.sender == owner || msg.sender == MIMIS, 'UniswapV3Staker::fundIncentive: not owner or mimis');
        IncentiveKey memory key = incentiveKeys[token];
        bytes32 id = IncentiveId.compute(key);
        incentives[id].totalRewardUnclaimed += amount;
        
    }

    function endIncentive(IncentiveKey memory key) external override returns (uint256 refund) {
        require(block.timestamp >= key.endTime, 'UniswapV3Staker::endIncentive: cannot end incentive before end time');

        bytes32 incentiveId = IncentiveId.compute(key);
        Incentive storage incentive = incentives[incentiveId];

        refund = incentive.totalRewardUnclaimed;

        require(refund > 0, 'UniswapV3Staker::endIncentive: no refund available');
        require(
            incentive.numberOfStakes == 0,
            'UniswapV3Staker::endIncentive: cannot end incentive while deposits are staked'
        );

        // issue the refund
        incentive.totalRewardUnclaimed = 0;
        TransferHelperExtended.safeTransfer(address(key.rewardToken), key.refundee, refund);

        // note we never clear totalSecondsClaimedX128

        emit IncentiveEnded(incentiveId, refund);
    }
    function onERC721Received(
        address,
        address from,
        uint256 tokenId,
        bytes calldata data
    ) external returns (bytes4) {
        require(
            msg.sender == address(nfpm),
            'UniswapV3Staker::onERC721Received: not a univ3 nft'
        );

        (, , , , , int24 tickLower, int24 tickUpper, , , , , ) = nfpm.positions(tokenId);

        deposits[tokenId] = Deposit({owner: from, numberOfStakes: 0, tickLower: tickLower, tickUpper: tickUpper});
        emit DepositTransferred(tokenId, address(0), from);

        _stakeToken(tokenId);
        return this.onERC721Received.selector;
    }

    function transferDeposit(uint256 tokenId, address to) external override {
        require(to != address(0), 'UniswapV3Staker::transferDeposit: invalid transfer recipient');
        address depositOwner = deposits[tokenId].owner;
        require(depositOwner == msg.sender, 'UniswapV3Staker::transferDeposit: can only be called by deposit owner');
        deposits[tokenId].owner = to;
        emit DepositTransferred(tokenId, owner, to);
    }

    function withdrawToken(
        uint256 tokenId,
        address to,
        bytes memory data
    ) external override {
        require(to != address(this), 'UniswapV3Staker::withdrawToken: cannot withdraw to staker');
        Deposit memory deposit = deposits[tokenId];
        require(deposit.numberOfStakes == 0, 'UniswapV3Staker::withdrawToken: cannot withdraw token while staked');
        require(deposit.owner == msg.sender, 'UniswapV3Staker::withdrawToken: only owner can withdraw token');

        delete deposits[tokenId];
        emit DepositTransferred(tokenId, deposit.owner, address(0));

        nfpm.safeTransferFrom(address(this), to, tokenId, data);
    }

    function stakeToken(uint256 tokenId) external  {
        require(deposits[tokenId].owner == msg.sender, 'UniswapV3Staker::stakeToken: only owner can stake token');
        _stakeToken(tokenId);
    }

    function unstakeToken(uint256 tokenId) external override {
        Deposit memory deposit = deposits[tokenId];
        // anyone can call unstakeToken if the block time is after the end time of the incentive
        for (uint i = 0; i < tokenArray.length; i++) {
            IncentiveKey memory key = incentiveKeys[tokenArray[i]];
            bytes32 id = IncentiveId.compute(key);
            if (block.timestamp < key.endTime) {
                require(
                    deposit.owner == msg.sender,
                    'UniswapV3Staker::unstakeToken: only owner can withdraw token before incentive end time'
                );
            }
            (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity) = stakes(tokenId, id);

            require(liquidity != 0, 'UniswapV3Staker::unstakeToken: stake does not exist');

            Incentive storage incentive = incentives[id];

            deposits[tokenId].numberOfStakes--;
            incentive.numberOfStakes--;

            (, uint160 secondsPerLiquidityInsideX128, ) =
                key.pool.snapshotCumulativesInside(deposit.tickLower, deposit.tickUpper);
            (uint256 reward, uint160 secondsInsideX128) =
                RewardMath.computeRewardAmount(
                    incentive.totalRewardUnclaimed,
                    incentive.totalSecondsClaimedX128,
                    key.startTime,
                    key.endTime,
                    liquidity,
                    secondsPerLiquidityInsideInitialX128,
                    secondsPerLiquidityInsideX128,
                    block.timestamp
                );

            // if this overflows, e.g. after 2^32-1 full liquidity seconds have been claimed,
            // reward rate will fall drastically so it's safe
            incentive.totalSecondsClaimedX128 += secondsInsideX128;
            // reward is never greater than total reward unclaimed
            incentive.totalRewardUnclaimed -= reward;
            // this only overflows if a token has a total supply greater than type(uint256).max
            rewards[key.rewardToken][deposit.owner] += reward;

            Stake storage stake = _stakes[tokenId][id];
            delete stake.secondsPerLiquidityInsideInitialX128;
            delete stake.liquidityNoOverflow;
            if (liquidity >= type(uint96).max) delete stake.liquidityIfOverflow;
            emit TokenUnstaked(tokenId, id);
            }
    }

    function claimRewards(
        address to
    ) external returns (uint256[] memory) {
        uint256[] memory issuedRewards = new uint256[](tokenArray.length);
        for (uint i = 0; i < tokenArray.length; i++) {
            IERC20Minimal rewardToken = IERC20Minimal(tokenArray[i]);
            uint256 reward = rewards[rewardToken][msg.sender];
            rewards[rewardToken][msg.sender] -= reward;
            TransferHelperExtended.safeTransfer(address(rewardToken), to, reward);
            emit RewardClaimed(to, reward);
            issuedRewards[i] = reward;  
        }
        return issuedRewards;
    }

    function getRewardInfo(address token, uint256 tokenId)
        external
        view
        returns (uint256 reward, uint160 secondsInsideX128)
    {
        IncentiveKey memory key = incentiveKeys[token];
        bytes32 incentiveId = IncentiveId.compute(key);

        (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity) = stakes(tokenId, incentiveId);
        require(liquidity > 0, 'UniswapV3Staker::getRewardInfo: stake does not exist');

        Deposit memory deposit = deposits[tokenId];
        Incentive memory incentive = incentives[incentiveId];

        (, uint160 secondsPerLiquidityInsideX128, ) =
            key.pool.snapshotCumulativesInside(deposit.tickLower, deposit.tickUpper);

        (reward, secondsInsideX128) = RewardMath.computeRewardAmount(
            incentive.totalRewardUnclaimed,
            incentive.totalSecondsClaimedX128,
            key.startTime,
            key.endTime,
            liquidity,
            secondsPerLiquidityInsideInitialX128,
            secondsPerLiquidityInsideX128,
            block.timestamp
        );
    }

    function _stakeToken(uint256 tokenId) private {
        for (uint256 i = 0; i < tokenArray.length; i++) {
            IncentiveKey memory incentiveKey = incentiveKeys[tokenArray[i]];
            bytes32 id = IncentiveId.compute(incentiveKey);
            require(block.timestamp >= incentiveKey.startTime, 'UniswapV3Staker::stakeToken: incentive not started');
            require(block.timestamp < incentiveKey.endTime, 'UniswapV3Staker::stakeToken: incentive ended');
           /* 
            require(
                incentives[id].totalRewardUnclaimed > 0,
                'UniswapV3Staker::stakeToken: non-existent incentive'
            );
            */
            require(
                _stakes[tokenId][id].liquidityNoOverflow == 0,
                'UniswapV3Staker::stakeToken: token already staked'
            );
            (IUniswapV3Pool pool, int24 tickLower, int24 tickUpper, uint128 liquidity) =
                NFTPositionInfo.getPositionInfo(factory, nfpm, tokenId);
            //require(pool == incentiveKey.pool, 'UniswapV3Staker::stakeToken: token pool is not the incentive pool');
            require(liquidity > 0, 'UniswapV3Staker::stakeToken: cannot stake token with 0 liquidity');

            deposits[tokenId].numberOfStakes++;
            incentives[id].numberOfStakes++;
            (, uint160 secondsPerLiquidityInsideX128, ) = pool.snapshotCumulativesInside(tickLower, tickUpper);
            if (liquidity >= type(uint96).max) {
                _stakes[tokenId][id] = Stake({
                    secondsPerLiquidityInsideInitialX128: secondsPerLiquidityInsideX128,
                    liquidityNoOverflow: type(uint96).max,
                    liquidityIfOverflow: liquidity

                });
            } else {
                Stake storage stake = _stakes[tokenId][id];
                stake.secondsPerLiquidityInsideInitialX128 = secondsPerLiquidityInsideX128;
                stake.liquidityNoOverflow = uint96(liquidity);
            }

            emit TokenStaked(tokenId, id, liquidity);
        }


    }
}