// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;


library Slots {
    
    bytes32 internal constant IMPLEMENTATION =
        0x360894a13ba1a3210667c828492db98dca3e2076cc3735a920a3ca505d382bbc;
    
    bytes32 internal constant ADMIN =
        0xb53127684a568b3173ae13b9f8a6016e243e63b6e8ee1178d6a717850b5d6103;
    
    bytes32 internal constant INIT_FLAG =
        0xbee2d6b6f0b2a2c1a9f1a7a3b7d2d9f0e1a2b3c4d5e6f708192a3b4c5d6e7f80;

    
    function _get(bytes32 slot) internal view returns (address a) { assembly { a := sload(slot) } }
    function _set(bytes32 slot, address a) internal { assembly { sstore(slot, a) } }

    function _getBool(bytes32 slot) internal view returns (bool v) { assembly { v := sload(slot) } }
    function _setBool(bytes32 slot, bool v) internal { assembly { sstore(slot, v) } }
}


contract TarotControllerSimple {
    event Upgraded(address indexed newImplementation);
    event AdminChanged(address indexed newAdmin);
    event InitializedViaProxy();

    modifier onlyAdmin() {
        require(msg.sender == Slots._get(Slots.ADMIN), "not admin");
        _;
    }

    
    constructor(address implementation_) {
        require(implementation_ != address(0), "zero impl");
        require(implementation_.code.length > 0, "no code");
        Slots._set(Slots.IMPLEMENTATION, implementation_);
        Slots._set(Slots.ADMIN, msg.sender);
    }

    /* ===== 管理/查询 ===== */
    function implementation() external view returns (address) {
        return Slots._get(Slots.IMPLEMENTATION);
    }

    function admin() external view returns (address) {
        return Slots._get(Slots.ADMIN);
    }

    function upgradeTo(address newImpl) external onlyAdmin {
        require(newImpl != address(0), "zero impl");
        require(newImpl.code.length > 0, "no code");
        Slots._set(Slots.IMPLEMENTATION, newImpl);
        emit Upgraded(newImpl);
    }

    function changeAdmin(address newAdmin) external onlyAdmin {
        require(newAdmin != address(0), "zero admin");
        Slots._set(Slots.ADMIN, newAdmin);
        emit AdminChanged(newAdmin);
    }

    
    function initializeProxy(bytes calldata initCalldata) external onlyAdmin {
        require(!Slots._getBool(Slots.INIT_FLAG), "already inited");
        address impl = Slots._get(Slots.IMPLEMENTATION);
        require(impl.code.length > 0, "no impl");
        (bool ok, ) = impl.delegatecall(initCalldata);
        require(ok, "init failed");
        Slots._setBool(Slots.INIT_FLAG, true);
        emit InitializedViaProxy();
    }

    
    receive() external payable {
        revert("no direct ETH");
    }

    
    fallback() external payable {
        address impl = Slots._get(Slots.IMPLEMENTATION);
        require(impl.code.length > 0, "no impl");
        assembly {
            calldatacopy(0, 0, calldatasize())
            let result := delegatecall(gas(), impl, 0, calldatasize(), 0, 0)
            returndatacopy(0, 0, returndatasize())
            switch result
            case 0 { revert(0, returndatasize()) }
            default { return(0, returndatasize()) }
        }
    }
}
