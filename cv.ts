import * as XLSX from 'xlsx'
import * as fs from 'fs'
import { rpcList } from './list'

interface NativeCurrency {
  name: string
  symbol: string
  decimals: number
}

interface Network {
  name: string
  chainId: number
  shortName: string
  networkId: number
  nativeCurrency: NativeCurrency
  rpc: string[]
  faucets: string[]
  infoURL: string
}

interface FlattenedObject {
  [key: string]: any
}

function flattenObject(obj: any, prefix = ''): FlattenedObject {
  return Object.keys(obj).reduce((acc: FlattenedObject, k: string) => {
    const pre = prefix.length ? `${prefix}.` : ''
    if (typeof obj[k] === 'object' && obj[k] !== null && !Array.isArray(obj[k])) {
      Object.assign(acc, flattenObject(obj[k], pre + k))
    } else {
      acc[pre + k] = obj[k]
    }
    return acc
  }, {})
}

function jsonToXlsx(jsonData: Network[], fileName: string): void {
  const flatJsonData = jsonData.map((item) => flattenObject(item))
  const worksheet = XLSX.utils.json_to_sheet(flatJsonData)
  const workbook = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(workbook, worksheet, 'Sheet1')
  const excelBuffer = XLSX.write(workbook, { bookType: 'xlsx', type: 'buffer' })

  fs.writeFileSync(fileName, excelBuffer)
}

jsonToXlsx(rpcList, 'ethereum_networks.xlsx')
