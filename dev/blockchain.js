const sha256 = require('sha256')
const currentNodeUrl = process.argv[3];
const uuid = require('uuid').v4;



function Blockchain()
{
    this.chain = [];
    this.transactions = [];
    this.currentNodeUrl = currentNodeUrl;
    this.networkNodes = [];
    //genesis block
    this.createBlock(1,'0','0');
}

Blockchain.prototype.createBlock = function(nonce , prevHash , currHash)
{
    const newBlock = {
        index : this.chain.length + 1,
        timeStamp : Date.now(),
        transactions : this.newTransactions,
        nonce : nonce,
        hash : currHash,
        prevHash : prevHash
    };

    this.newTransactions = [];
    this.chain.push(newBlock);

    return newBlock;

}

Blockchain.prototype.getLastBlock = function()
{
    return this.chain[this.chain.length - 1];
}

Blockchain.prototype.createTransaction = function(amount , sender , receiver)
{
    const newTransaction = {
        amount : amount,
        sender : sender,
        receiver : receiver,
        transactionId : uuid().split('-').join('')
    };

    return newTransaction;
}

Blockchain.prototype.toPendingTransactions = function(transactionObject)
{
    this.newTransactions.push(transactionObject);
    return this.getLastBlock['index'] + 1;
};

Blockchain.prototype.hash = function(nonce , prevHash , blockData)
{
    const mergedData = nonce.toString() + prevHash + JSON.stringify(blockData);
    const hash = sha256(mergedData);
    return hash;
}

Blockchain.prototype.proofOfWork = function(prevHash , blockData)
{
    let nonce = 0;
    let hash = this.hash(nonce,prevHash,blockData);
    while(hash.substring(0,4)!=="0000")
    {
        nonce++;
        hash = this.hash(nonce,prevHash,blockData);
    }

    return nonce;
}


Blockchain.prototype.chainIsValid = function(blockchain) {
	let validChain = true;

	for (var i = 1; i < blockchain.length; i++) {
		const currentBlock = blockchain[i];
		const prevBlock = blockchain[i - 1];
		const blockHash = this.hash(currentBlock['nonce'],prevBlock['hash'], { transactions: currentBlock['transactions'], index: currentBlock['index'] });
		if (blockHash.substring(0, 4) !== '0000') 
        {
            validChain = false;
        }
		if (currentBlock['prevHash'] !== prevBlock['hash']) 
        {
            validChain = false;
        }
	};

	const genesisBlock = blockchain[0];
	const correctNonce = genesisBlock['nonce'] === 1;
	const correctPreviousBlockHash = genesisBlock['prevHash'] === '0';
	const correctHash = genesisBlock['hash'] === '0';
	const correctTransactions = genesisBlock['transactions'].length === 0;

	if (!correctNonce || !correctPreviousBlockHash || !correctHash || !correctTransactions)
    { 
        validChain = false;
    }

	return validChain;
};

Blockchain.prototype.getBlock = function(blockHash) {
	let correctBlock = null;
	this.chain.forEach(block => {
		if (block.hash === blockHash) correctBlock = block;
	});
	return correctBlock;
};

Blockchain.prototype.getTransaction = function(transactionId) {
	let correctTransaction = null;
	let correctBlock = null;

	this.chain.forEach(block => {
		block.transactions.forEach(transaction => {
			if (transaction.transactionId === transactionId) {
				correctTransaction = transaction;
				correctBlock = block;
			};
		});
	});

	return {
		transaction: correctTransaction,
		block: correctBlock
	};
};

Blockchain.prototype.getAddressData = function(address) {
	const addressTransactions = [];
	this.chain.forEach(block => {
		block.transactions.forEach(transaction => {
			if(transaction.sender === address || transaction.receiver === address) {
				addressTransactions.push(transaction);
			};
		});
	});

	let balance = 0;
	addressTransactions.forEach(transaction => {
		if (transaction.receiver === address) balance += transaction.amount;
		else if (transaction.sender === address) balance -= transaction.amount;
	});

	return {
		addressTransactions: addressTransactions,
		addressBalance: balance
	};
};

module.exports = Blockchain;