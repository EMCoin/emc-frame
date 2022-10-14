import React from 'react'
import Restore from 'react-restore'
import BigNumber from 'bignumber.js'

import { usesBaseFee, GasFeesSource } from '../../../../../../../resources/domain/transaction'
import link from '../../../../../../../resources/link'

const FEE_WARNING_THRESHOLD_USD = 50

function toDisplayUSD (bn) {
  const usd = bn.decimalPlaces(2, BigNumber.ROUND_FLOOR)
  return usd.isZero() ? '< $0.01' : `$${usd.toFormat()}`
}

function toDisplayEther (bn) {
  const ether = bn.shiftedBy(-18).decimalPlaces(6, BigNumber.ROUND_FLOOR)

  return ether.isZero() ? '< 0.000001' : ether.toFormat()
}

function toDisplayGwei (bn) {
  const gwei = bn.shiftedBy(-9).decimalPlaces(3, BigNumber.ROUND_FLOOR)

  return gwei.isZero() ? '' : gwei.toFormat()
}

function toDisplayWei (bn) {
  return bn.toFormat(0)
}

const GasDisplay = ({ maxFeePerGas }) => {
  const gweiDisplayValue = toDisplayGwei(maxFeePerGas)
  const displayValue = gweiDisplayValue || toDisplayWei(maxFeePerGas)
  const displayLabel = !!gweiDisplayValue ? 'Gwei' : 'Wei'

  return (
    <div data-testid='gas-display' className='_txFeeGwei'>
      <span className='_txFeeGweiValue'>{displayValue}</span>
      <span className='_txFeeGweiLabel'>{displayLabel}</span>
    </div>
  )
}     

const USDEstimateDisplay = ({ maxFeePerGas, maxGas, maxFeeUSD, nativeUSD, symbol }) => {
  // accounts for two potential 12.5% block fee increases
  const reduceFactor = BigNumber(9).dividedBy(8)
  const minFeePerGas = maxFeePerGas.dividedBy(reduceFactor).dividedBy(reduceFactor)

  // accounts for the 50% padding in the gas estimate in the provider
  const minGas = maxGas.dividedBy(BigNumber(1.5))

  const minFee = minFeePerGas.multipliedBy(minGas)
  const minFeeUSD = minFee.shiftedBy(-18).multipliedBy(nativeUSD)
  const displayMinFeeUSD = toDisplayUSD(minFeeUSD)
  const displayMaxFeeUSD = toDisplayUSD(maxFeeUSD)
  
  return <div data-testid='usd-estimate-display' className='_txMainTagFee'>
    <div className={maxFeeUSD.toNumber() > FEE_WARNING_THRESHOLD_USD ? '_txFeeValueDefault _txFeeValueDefaultWarn' : '_txFeeValueDefault'}>
      <span>{'≈'}</span>
      {displayMaxFeeUSD === '< $0.01' ? 
      <span>{displayMaxFeeUSD}</span> : 
      <>      
        <span>{displayMinFeeUSD}</span>
        <span>{'-'}</span>
        <span>{displayMaxFeeUSD}</span>
      </>
      }
      <span>{`in ${symbol}`}</span>
    </div>
  </div>
}

class TxFee extends React.Component {
  constructor (props, context) {
    super(props, context)
  }

  render () {
    const req = this.props.req

    const chain = { 
      type: 'ethereum', 
      id: parseInt(req.data.chainId, 16)
    }

    const { symbol = '?', isTestnet } = this.store('main.networks', chain.type, chain.id)
    const nativeCurrency = this.store('main.networksMeta', chain.type, chain.id, 'nativeCurrency')
    const nativeUSD = nativeCurrency && nativeCurrency.usd && !isTestnet ? nativeCurrency.usd.price : 0

    let maxFeePerGas, maxFee, maxFeeUSD

    const maxGas = BigNumber(req.data.gasLimit, 16)

    if (usesBaseFee(req.data)) {
      maxFeePerGas = BigNumber(req.data.maxFeePerGas, 16)
      maxFee = maxFeePerGas.multipliedBy(maxGas)
      maxFeeUSD = maxFee.shiftedBy(-18).multipliedBy(nativeUSD)
    } else {
      maxFeePerGas = BigNumber(req.data.gasPrice, 16)
      maxFee = maxFeePerGas.multipliedBy(maxGas)
      maxFeeUSD = maxFee.shiftedBy(-18).multipliedBy(nativeUSD)
    }

    const displayEther = toDisplayEther(maxFee)

    return (
      <div className='_txMain' style={{ animationDelay: (0.1 * this.props.i) + 's' }}>
        <div className='_txMainInner'>
          <div className='_txLabel'>Fee</div>
          <div className='_txMainValues'>
            <div className='_txMainValuesRow'>
              <div className='_txMainValuesColumn' style={{ flex: '1' }}>
                <div className='_txFeeBar _txMainValue _txMainValueClickable' onClick={() => {
                  link.send('nav:update', 'panel', { data: { step: 'adjustFee' } })
                }}>
                  <GasDisplay maxFeePerGas={maxFeePerGas} />
                </div>
              </div>
              <div className='_txMainValuesColumn' style={{ flex: '1' }}>
                <div className='_txMainValue _txFeeTotal'>
                  <div>
                    <span className='_txFeeETH'>
                      {symbol}
                    </span>
                    <span className='_txFeeETHValue'>
                      {displayEther}
                    </span>
                  </div>
                </div>
                <USDEstimateDisplay maxFeePerGas={maxFeePerGas} maxGas={maxGas} maxFeeUSD={maxFeeUSD} nativeUSD={nativeUSD} symbol={symbol} />
              </div>
            </div>
            {req.feesUpdatedByUser ? (
              <div className='_txMainTag'>
                {`Gas values set by user`}
              </div>
            ) : req.data.gasFeesSource !== GasFeesSource.Frame ? (
              <div className='_txMainTag'>
                {`Gas values set by ${req.data.gasFeesSource}`}
              </div>
            ) : null}
          </div>
        </div>
      </div>
    )
  }
}

export default Restore.connect(TxFee)
