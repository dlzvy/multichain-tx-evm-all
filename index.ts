import Web3 from 'web3'
import promptSync from 'prompt-sync'
import { green, red, yellow, cyan, underline } from 'kleur'
import { Listr } from 'listr2'
import dotenv from 'dotenv'
import { rpcList } from './list'
import destinationAddresses from './address'

dotenv.config()

const prompt = promptSync()
const privateKey = process.env.PRIVATE_KEY

if (!privateKey) {
  console.error(red('Private key gak ada di file .env'))
  process.exit(1)
}

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

async function main() {
  const chainIdInput = prompt('Masukkan Chain ID yang ingin kamu gunakan: ')
  const selectedNetwork = rpcList.find((network) => network.chainId === Number(chainIdInput))

  if (!selectedNetwork) {
    console.log(red('Chain ID gak ada. Mungkin typo atau coba Chain ID yang lain ser!!!'))
    return
  }

  console.log(yellow(`Bener gak nama networknya ${underline(selectedNetwork.name)} yang kamu maksud? (Y/N)`))
  const confirmation = prompt('> ').toLowerCase()

  if (confirmation !== 'y') {
    console.log(red('Pilih ulang Chain ID.'))
    return
  }

  const web3 = new Web3(selectedNetwork.rpc[0])
  const account = web3.eth.accounts.privateKeyToAccount('0x' + privateKey)
  web3.eth.accounts.wallet.add(account)

  const valueInput = prompt(
    `Masukkan jumlah token yang akan dikirim (dalam ${selectedNetwork.nativeCurrency.symbol}): `
  )
  const valueInWei = web3.utils.toWei(valueInput, 'ether')

  let nonce = await web3.eth.getTransactionCount(account.address)

  const tasks = new Listr(
    destinationAddresses.map((toAddress) => ({
      title: `Mengirim ke wallet ${toAddress}`,
      task: async (ctx, task) => {
        const balance = await web3.eth.getBalance(account.address)

        if (Number(balance) <= 0) {
          throw new Error('Saldo nya kosong ser!')
        }

        if (Number(balance) < Number(valueInWei)) {
          throw new Error(`Saldomu gak cukup buat ngelakuin ${destinationAddresses.length} transaksi`)
        }

        const tx: {
          from: string
          to: string
          value: string
          gas?: bigint
          gasPrice?: bigint
          nonce: number
        } = {
          from: account.address,
          to: toAddress,
          value: valueInWei,
          nonce: Number(nonce),
        }

        const gas = await web3.eth.estimateGas(tx)
        const gasPrice = await web3.eth.getGasPrice()
        tx.gas = gas
        tx.gasPrice = gasPrice

        const signedTx = await web3.eth.accounts.signTransaction(tx, account.privateKey)
        const receipt = await web3.eth.sendSignedTransaction(signedTx.rawTransaction as string)

        console.log(cyan('Transaction hash: '), green(receipt.transactionHash.toString()))
        task.title = `Sukses mengirim ke wallet ${toAddress}`

        nonce = nonce + BigInt(1)
        await sleep(3000)
      },
    })),
    { concurrent: false, exitOnError: false }
  )

  tasks.run().catch((err) => {
    console.error(err)
  })
}

main().catch(console.error)
