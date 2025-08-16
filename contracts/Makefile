# Makefile for the MonaPacket Foundry project

#------------------------------------------------------------------
# VARIABLES
#------------------------------------------------------------------
-include .env
export

VERBOSITY = -vvvv
MONAD_VERIFIER_URL = 'https://sourcify-api-monad.blockvision.org'

#------------------------------------------------------------------
# STANDARD COMMANDS
#------------------------------------------------------------------
all: build
install:
	@echo "=============== 📥 Installing Dependencies ==============="
	@forge install
build: clean
	@echo "=============== 🔨 Building Contracts ==============="
	@forge build
test:
	@echo "=============== 🧪 Running Tests ==============="
	@forge test
clean:
	@echo "=============== 🧹 Cleaning Build Artifacts ==============="
	@forge clean

#------------------------------------------------------------------
# DEPLOYMENT COMMANDS (只部署，不验证)
#------------------------------------------------------------------
deploy-app-local: build
	@echo "=============== 🚀 Deploying MonaPacket App to Local Anvil ==============="
	@forge script script/MonaPacket.s.sol:MonaPacketScript --rpc-url $(LOCAL_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast $(VERBOSITY)
	@make extract-all-abis

deploy-token-local: build
	@echo "=============== 🪙 Deploying MonaPacketToken to Local Anvil ==============="
	@forge script script/MonaPacketToken.s.sol:MonaPacketTokenScript --rpc-url $(LOCAL_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast $(VERBOSITY)
	@make extract-abi-token

deploy-app-monad-testnet: build
	@echo "=============== 🚀 Deploying MonaPacket App to Monad Testnet ==============="
	@forge script script/MonaPacket.s.sol:MonaPacketScript --rpc-url $(MONAD_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --legacy $(VERBOSITY)
	@make extract-all-abis

deploy-token-monad-testnet: build
	@echo "=============== 🪙 Deploying MonaPacketToken to Monad Testnet ==============="
	@forge script script/MonaPacketToken.s.sol:MonaPacketTokenScript --rpc-url $(MONAD_RPC_URL) --private-key $(PRIVATE_KEY) --broadcast --legacy $(VERBOSITY)
	@make extract-abi-token

#------------------------------------------------------------------
# VERIFICATION COMMANDS (独立验证)
#------------------------------------------------------------------
# 使用方法: make verify-monad-testnet address=<合约地址> contract=MonaPacket
verify-monad-testnet:
	@echo "=============== 🔎 Verifying $(contract) at $(address) on Monad Testnet ==============="
	@forge verify-contract \
		--rpc-url $(MONAD_RPC_URL) \
		--verifier sourcify \
		--verifier-url $(MONAD_VERIFIER_URL) \
		$(address) \
		src/$(contract).sol:$(contract) \
		$(VERBOSITY)

#------------------------------------------------------------------
# ABI EXTRACTION COMMANDS
#------------------------------------------------------------------
extract-all-abis: extract-abi-monapacket extract-abi-monapacketnft extract-abi-monapacketaccount
	@echo "=============== ✅ All App ABIs extracted successfully! ==============="
extract-abi-monapacket:
	@mkdir -p abis; cp out/MonaPacket.sol/MonaPacket.json abis/MonaPacket.json
extract-abi-monapacketnft:
	@mkdir -p abis; cp out/MonaPacketNFT.sol/MonaPacketNFT.json abis/MonaPacketNFT.json
extract-abi-monapacketaccount:
	@mkdir -p abis; cp out/MonaPacketAccount.sol/MonaPacketAccount.json abis/MonaPacketAccount.json
extract-abi-token:
	@mkdir -p abis; cp out/MonaPacketToken.sol/MonaPacketToken.json abis/MonaPacketToken.json

.PHONY: all install build test clean deploy-app-local deploy-token-local deploy-app-monad-testnet deploy-token-monad-testnet verify-monad-testnet extract-all-abis extract-abi-monapacket extract-abi-monapacketnft extract-abi-monapacketaccount extract-abi-token