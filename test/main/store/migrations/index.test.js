import migrations from '../../../../main/store/migrations'

let state

describe('migration 13', () => {
  beforeEach(() => {
    state = {
      main: {
        _version: 12,
        networks: {
          ethereum: {
            1: {
              id: 1,
              type: 'ethereum',
              layer: 'mainnet',
              symbol: 'ETH',
              name: 'Mainnet'
            },
            137: {
              id: 1,
              type: 'ethereum',
              layer: 'sidechain',
              symbol: 'MATIC',
              name: 'Polygon',
              connection: {
                primary: {
                  on: true,
                  current: 'matic'
                },
                secondary: {
                  on: false,
                  current: 'local'
                }
              }
            }
          }
        },
        networksMeta: {
          ethereum: { }
        }
      }
    }
  })

  it('adds network meta for a network with none defined', () => {
    const updatedState = migrations.apply(state)

    expect(updatedState.main.networksMeta.ethereum[1]).toHaveProperty('gas.price.selected')
    expect(updatedState.main.networksMeta.ethereum[1]).toHaveProperty('gas.price.levels')
  })

  it('adds default gas price info', () => {
    state.main.networksMeta.ethereum = {
      1: { }
    }

    const updatedState = migrations.apply(state)

    expect(updatedState.main.networksMeta.ethereum[1]).toHaveProperty('gas.price.selected')
    expect(updatedState.main.networksMeta.ethereum[1]).toHaveProperty('gas.price.levels')
  })

  it('adds sets a default selected gas level', () => {
    state.main.networksMeta.ethereum = {
      1: {
        gas: {
          price: {
            levels: { slow: '', standard: '', fast: '', asap: '', custom: '' }
          }
        }
      }
    }

    const updatedState = migrations.apply(state)

    expect(updatedState.main.networksMeta.ethereum[1].gas.price.selected).toBe('standard')
  })

  it('adds default gas levels', () => {
    state.main.networksMeta.ethereum = {
      1: {
        gas: {
          price: {
            selected: 'standard'
          }
        }
      }
    }

    const updatedState = migrations.apply(state);

    ['slow', 'standard', 'fast', 'asap', 'custom'].forEach(level => {
      expect(updatedState.main.networksMeta.ethereum[1].gas.price).toHaveProperty(`levels.${level}`)
    })
  })

  it('does not change existing gas settings', () => {
    state.main.networksMeta.ethereum = {
      1: {
        gas: {
          price: {
            selected: 'asap',
            levels: {
              slow: '0x0a93'
            }
          }
        }
      }
    }

    const updatedState = migrations.apply(state)

    expect(updatedState.main.networksMeta.ethereum[1].gas.price.selected).toBe('asap')
    expect(updatedState.main.networksMeta.ethereum[1].gas.price.levels.slow).toBe('0x0a93')
  })
})

describe('migration 14', () => {
  beforeEach(() => {
    state = {
      main: {
        _version: 13,
        networks: {
          ethereum: {
            137: {
              id: 1,
              type: 'ethereum',
              layer: 'sidechain',
              symbol: 'MATIC',
              name: 'Polygon',
              connection: {
                primary: {
                  on: true,
                  current: 'matic'
                },
                secondary: {
                  on: false,
                  current: 'local'
                }
              }
            }
          }
        },
        networksMeta: {
          ethereum: { }
        }
      }
    }
  })

  const connectionPriorities = ['primary', 'secondary']

  connectionPriorities.forEach(priority => {
    it(`updates the ${priority} polygon connection from matic to infura`, () => {
      state.main.networks.ethereum[137].connection[priority].current = 'matic'
  
      const updatedState = migrations.apply(state)
  
      expect(updatedState.main.networks.ethereum[137].connection[priority].current).toBe('infura')

      // ensure other settings weren't changed
      expect(updatedState.main.networks.ethereum[137].connection[priority].on)
        .toBe(state.main.networks.ethereum[137].connection[priority].on)
    })
  
    it(`does not update the ${priority} polygon connection if not matic`, () => {
      state.main.networks.ethereum[137].connection[priority].current = 'local'
  
      const updatedState = migrations.apply(state)
  
      expect(updatedState.main.networks.ethereum[137].connection[priority].current).toBe('local')

      // ensure other settings weren't changed
      expect(updatedState.main.networks.ethereum[137].connection[priority].on)
        .toBe(state.main.networks.ethereum[137].connection[priority].on)
    })
  })

  it('adds Arbitrum network information when none exists', () => {
    delete state.main.networks.ethereum[42161]

    const updatedState = migrations.apply(state)

    const arbitrum = updatedState.main.networks.ethereum[42161]

    expect(arbitrum).toMatchObject({
      id: 42161,
      type: 'ethereum',
      layer: 'rollup',
      symbol: 'ETH',
      name: 'Arbitrum',
      explorer: 'https://explorer.arbitrum.io',
      gas: { price: { selected: 'standard', levels: {} } }
    })

    expect(arbitrum.connection.primary.on).toBe(true)
    expect(arbitrum.connection.primary.current).toBe('infura')
    expect(arbitrum.connection.secondary.on).toBe(false)
    expect(arbitrum.connection.secondary.current).toBe('custom')
    expect(arbitrum.on).toBe(false)
  })

  it('does not change existing Arbitrum network information', () => {
    state.main.networks.ethereum[42161] = {
      explorer: 'https://custom-explorer.arbitrum.io',
      connection: {
        primary: { on: true, current: 'local' }
      }
    }

    const updatedState = migrations.apply(state)

    const arbitrum = updatedState.main.networks.ethereum[42161]

    expect(arbitrum.explorer).toBe('https://custom-explorer.arbitrum.io')
    expect(arbitrum.connection.primary.on).toBe(true)
    expect(arbitrum.connection.primary.current).toBe('local')
  })

  it('adds Arbitrum network meta information when none exists', () => {
    delete state.main.networksMeta.ethereum[42161]

    const updatedState = migrations.apply(state)

    const arbitrum = updatedState.main.networksMeta.ethereum[42161]

    expect(arbitrum.gas.fees.maxFeePerGas).toBe(undefined)
    expect(arbitrum).toMatchObject({
      gas: { fees: {} , price: { selected: 'standard', levels: {} } }
    })
  })

  it('does not change existing Arbitrum meta network information', () => {
    state.main.networksMeta.ethereum[42161] = {
      gas: {
        fees: {
          maxFeePerGas: '0xf'
        }
      }
    }

    const updatedState = migrations.apply(state)

    const arbitrum = updatedState.main.networksMeta.ethereum[42161]

    expect(arbitrum.gas.fees.maxFeePerGas).toBe('0xf')
  })
})