const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const Blockchain = require('./blockchain');
const uuid = require('uuid').v4;
const port = process.argv[2];
const rp = require('request-promise');
const requestPromise = require('request-promise');

const chain = new Blockchain();
const nodeAddress = uuid().split('-').join('');

app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

app.get('/blockchain', function (req, res) 
{
  res.send(chain);
});

app.post('/transaction',function (req,res)
{
    const newTransaction = req.body;
    const blockIndex = chain.toPendingTransactions(newTransaction);
    res.json({note : `Transaction will be added to block ${blockIndex}`});
});

app.get('/mine',function (req , res)
{
    const lastBlock = chain.getLastBlock();
    const prevHash = lastBlock['hash'];
    const blockData = {
        transactions : chain.newTransactions,
        index : lastBlock['index']
    }

    const nonce = chain.proofOfWork(prevHash,blockData);
    const blockHash = chain.hash(nonce,prevHash,blockData);

    //rewarding the miner
    chain.createTransaction(5,"00",nodeAddress);

    const newBlock = chain.createBlock(nonce,prevHash,blockHash);

    const arrayOfPromises =[];
    chain.networkNodes.forEach(networkNodeUrl =>{
            const reqOptions = {
                uri : networkNodeUrl + '/receive-new-block',
                method : 'POST',
                body : {newBlock: newBlock},
                json : true
            };
            arrayOfPromises.push(rp(reqOptions));
    });

    Promise.all(arrayOfPromises)
    .then(data =>{
        const reqOptionss = {
            uri : chain.currentNodeUrl + '/transaction/broadcast',
            method : "POST",
            body : {
                amount : 10,
                sender : "00",
                receiver : nodeAddress
            },
            json : true
        };
        return rp(reqOptionss);
    })
    .then(data =>{
        res.json({
            note : "Block mined  and broadcasted successfully",
            block : newBlock
         });

   
    });
});

app.post('receive-new-block',function(req,res){
    const newBlock = req.body.newBlock
    const lastBlock = chain.getLastBlock();

    if(lastBlock.hash === newBlock.prevHash && lastBlock['index']+1===newBlock['index'])
    {
        chain.chain.push(newBlock);
        chain.newTransactions = [];
        res.json({
            note: 'New block received and accepted',
            newBlock: newBlock
        });
    }
    else
    {
        res.json({
            note : 'New block rejected',
            newBlock : newBlock
        });
    }
})

app.post('/register-and-broadcast-node',function(req,res){
    const newNodeUrl = req.body.newNodeUrl;
    if(chain.networkNodes.indexOf(newNodeUrl)==-1)
    {
        chain.networkNodes.push(newNodeUrl);
    }

    const arrayOfPromises = [];
    chain.networkNodes.forEach(networkNodeUrl => {
        const reqOptions = {
            uri : networkNodeUrl + '/register-node',
            method : 'POST',
            body : {newNodeUrl : newNodeUrl},
            json : true
        };
        arrayOfPromises.push(rp(reqOptions));
    });
    Promise.all(arrayOfPromises)
    .then(data => {
        const bulkRegister = {
            uri : newNodeUrl + '/bulk-register-nodes',
            method : 'POST',
            body : {allNetworkNodes : [...chain.networkNodes,chain.currentNodeUrl]},
            json : true
        };
        return rp(bulkRegister);
    })
    .then(data => {
        res.json({note : "New node registered"});
    });
});

app.post('/register-node',function(req,res){
    const newNodeUrl = req.body.newNodeUrl;
    //check if node not already present and it is not the current node
    if(chain.networkNodes.indexOf(newNodeUrl)==-1 && chain.currentNodeUrl!==newNodeUrl)
    {
        chain.networkNodes.push(newNodeUrl);
    }
    res.json({note : "New node registered successfully"});
});

app.post('/bulk-register-nodes',function(req,res){
    const allNetworkNodes = req.body.allNetworkNodes;
    allNetworkNodes.forEach(networkNodeUrl => {
        if(chain.networkNodes.indexOf(networkNodeUrl)==-1 && chain.currentNodeUrl!==networkNodeUrl)
        {
            chain.networkNodes.push(networkNodeUrl);
        }
    });
    res.json({note : "Bulk registration successful"});
});

app.post('/transaction/broadcast',function(req,res){
    const newTransaction = chain.createTransaction(req.body.amount , req.body.sender, req.body.receiver);
    chain.toPendingTransactions(newTransaction);

    const arrayOfPromises = [];
    chain.networkNodes.forEach(networkNodeUrl => {
        const reqOptions = {
            uri : networkNodeUrl + '/transaction',
            method : 'POST',
            body : newTransaction,
            json : true
        };
        arrayOfPromises.push(rp(reqOptions));
    });
    Promise.all(arrayOfPromises)
    .then(data => {
        res.json({note : "Transaction created and broadcast successful"});
    });
});

app.get('/consensus', function(req, res) {
	const arrayOfPromises = [];
	chain.networkNodes.forEach(networkNodeUrl => {
		const reqOptions = {
			uri: networkNodeUrl + '/blockchain',
			method: 'GET',
			json: true
		};

		arrayOfPromises.push(rp(reqOptions));
	});

	Promise.all(arrayOfPromises)
	.then(blockchains => {
		const currentChainLength = chain.chain.length;
		let maxChainLength = currentChainLength;
		let newLongestChain = null;
		let newPendingTransactions = null;

		blockchains.forEach(blockchain => {
			if (blockchain.chain.length > maxChainLength) {
				maxChainLength = blockchain.chain.length;
				newLongestChain = blockchain.chain;
				newPendingTransactions = blockchain.newTransactions;
			};
		});


		if (!newLongestChain || (newLongestChain && !bitcoin.chainIsValid(newLongestChain))) {
			res.json({
				note: 'Current chain has not been replaced.',
				chain: chain.chain
			});
		}
		else {
			chain.chain = newLongestChain;
			chain.newTransactions = newPendingTransactions;
			res.json({
				note: 'This chain has been replaced.',
				chain: chain.chain
			});
		}
	});
});


// get block by blockHash
app.get('/block/:blockHash', function(req, res) { 
	const blockHash = req.params.blockHash;
	const correctBlock = bitcoin.getBlock(blockHash);
	res.json({
		block: correctBlock
	});
});

app.get('/block/:blockHash', function(req, res) { 
	const blockHash = req.params.blockHash;
	const correctBlock = chain.getBlock(blockHash);
	res.json({
		block: correctBlock
	});
});

app.get('/transaction/:transactionId', function(req, res) {
	const transactionId = req.params.transactionId;
	const trasactionData = bitcoin.getTransaction(transactionId);
	res.json({
		transaction: trasactionData.transaction,
		block: trasactionData.block
	});
});

app.get('/address/:address', function(req, res) {
	const address = req.params.address;
	const addressData = chain.getAddressData(address);
	res.json({
		addressData: addressData
	});
});

app.get('/block-explorer', function(req, res) {
	res.sendFile('./block-explorer/index.html', { root: __dirname });
});

app.listen(port,function(){
    console.log("Listening on port "+ port.toString());
});