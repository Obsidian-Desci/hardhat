// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity 0.8.20;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@uniswap/v3-periphery/contracts/interfaces/INonfungiblePositionManager.sol";
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Pool.sol';
import '@uniswap/v3-periphery/contracts/libraries/PoolAddress.sol';
import '@uniswap/v3-core/contracts/interfaces/IUniswapV3Factory.sol';
import "./RewardMath.sol";

contract Mimisbrunnr is ERC20 {
    struct Deposit {
        address owner;
        uint48 numberOfStakes;
        int24 tickLower;
        int24 tickUpper;
    }
    mapping(uint256 => Deposit) public deposits;

    struct Stake {
        uint160 secondsPerLiquidityInsideInitialX128;
        uint96 liquidityNoOverflow;
        uint128 liquidityIfOverflow;
    }
    mapping(uint256 => Stake) private _stakes;

    address VITA = 0x81f8f0bb1cB2A06649E51913A151F0E7Ef6FA321;
    address VITAWETH = 0xcBcC3cBaD991eC59204be2963b4a87951E4d292B;

    //address ATH = 0xa4ffdf3208f46898ce063e25c1c43056fa754739;

    address HAIR = 0x9Ce115f0341ae5daBC8B477b74E83db2018A6f42;
    address HAIRWETH = 0x94DD312F6Cb52C870aACfEEb8bf5E4e28F6952ff;

    address GROW = 0x761A3557184cbC07b7493da0661c41177b2f97fA;
    address GROWWETH = 0x61847189477150832D658D8f34f84c603Ac269af;

    address LAKE =  0xF9Ca9523E5b5A42C3018C62B084Db8543478C400;
    address LAKEWETH = 0xeFd69F1FF464Ed673dab856c5b9bCA4D2847a74f;

    INonfungiblePositionManager public infpm = INonfungiblePositionManager(0xC36442b4a4522E871399CD717aBDD847Ab11FE88);

    IUniswapV3Factory public factory = IUniswapV3Factory(0x1F98431c8aD98523631AE4a59f267346ea31F984);

    uint256 startTime;
    uint256 rewardMultiplier;
    constructor() ERC20("Mimisbrunnr", "MIMIR") {
        _mint(msg.sender, 0);
        startTime = block.timestamp;
        rewardMultiplier = 1;
    }


    function onlyValidTokens(address token) internal {
        require((token == VITA || token == HAIR || token == GROW || token == LAKE), "invalid token");
    }

    function onlyValidPool(address pool) internal {
        require((pool == VITAWETH || pool == HAIRWETH || pool == GROWWETH || pool == LAKEWETH), "invalid pool");
    }

    function stakes(uint256 erc721Id)
        public
        view
        returns (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity)
    {
        Stake storage stake = _stakes[erc721Id];
        secondsPerLiquidityInsideInitialX128 = stake.secondsPerLiquidityInsideInitialX128;
        liquidity = stake.liquidityNoOverflow;
        if (liquidity == type(uint96).max) {
            liquidity = stake.liquidityIfOverflow;
        }
    }

    function stakeLP(
        uint256 erc721Id
    ) public {
        (, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, uint128 liquidity, , , , ) = infpm.positions(erc721Id);
        require(operator == msg.sender, "must be owner of nft");
        require(liquidity > 0, "must have a liquidity greater than zero");
        onlyValidTokens(token0);
        onlyValidTokens(token1);
        IUniswapV3Pool pool = IUniswapV3Pool(
            PoolAddress.computeAddress(
                address(factory),
                PoolAddress.PoolKey({token0: token0, token1: token1, fee: fee})
            )
        );
        onlyValidPool(address(pool));

        infpm.transferFrom(msg.sender, address(this), erc721Id);
        
        deposits[erc721Id] = Deposit({
            owner: operator,
            numberOfStakes: 0,
            tickLower: tickLower,
            tickUpper: tickUpper
        });

        deposits[erc721Id].numberOfStakes++;

        (, uint160 secondsPerLiquidityInsideX128, ) = pool.snapshotCumulativesInside(tickLower, tickUpper);

        if (liquidity >= type(uint96).max) {
            _stakes[erc721Id] = Stake({
                secondsPerLiquidityInsideInitialX128: secondsPerLiquidityInsideX128,
                liquidityNoOverflow: type(uint96).max,
                liquidityIfOverflow: liquidity
            });
        } else {
            Stake storage stake = _stakes[erc721Id];
            stake.secondsPerLiquidityInsideInitialX128 = secondsPerLiquidityInsideX128;
            stake.liquidityNoOverflow = uint96(liquidity);
        }
    }

    function unstakeLP(
        uint256 erc721Id
    ) public {
        Deposit memory deposit = deposits[erc721Id];
       require(msg.sender == deposit.owner, "must be owner of nft");
        (, address operator, address token0, address token1, uint24 fee, int24 tickLower, int24 tickUpper, , , , , ) = infpm.positions(erc721Id);
        IUniswapV3Pool pool = IUniswapV3Pool(
            PoolAddress.computeAddress(
                address(factory),
                PoolAddress.PoolKey({token0: token0, token1: token1, fee: fee})
            )
        );
       // require(deposit.numberOfStakes == 0, 'UniswapV3Staker::withdrawToken: cannot withdraw token while staked');

        (, uint160 secondsPerLiquidityInsideX128, ) =
            pool.snapshotCumulativesInside(deposit.tickLower, deposit.tickUpper);
        (uint160 secondsPerLiquidityInsideInitialX128, uint128 liquidity) = stakes(erc721Id);

        deposits[erc721Id].numberOfStakes--;
        (uint256 reward, uint160 secondsInsideX128) =
            RewardMath.computeRewardAmount(
                startTime,
                liquidity,
                secondsPerLiquidityInsideInitialX128,
                secondsPerLiquidityInsideX128,
                block.timestamp,
                rewardMultiplier
            );
    }
}
