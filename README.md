# react-use-async-effect-state

A React hook that provides state that is safely driven with async effects.

## Example usage

```typescript jsx
import {useAsyncEffectState} from "react-use-async-effect-state"

function App() {
    const MIN_PASSENGERS = 1
    const MAX_PASSENGERS = 100

    const [numPassengers, setNumPassengers] = useState(1)

    const priceEffect = useAsyncEffectState(
        async (): Promise<number> => {
            const res = await axios.get('http://localhost:3000/api/price', {
                params: {
                    numberOfPassengers: numPassengers,
                }
            })

            return res.data.ticketPrice as number
        },
        (/* error: unknown */) => {
            // a callback that will be invoked when there is an error
            // you can use it to display an error toast message
        },
        [numPassengers]
    )

    // priceEffect.error -> an error that was thrown by the effect
    // priceEffect.ready -> if the result is available && no error
    // priceEffect.result -> the result returned from effect

    const btnClickedPlus = () => {
        setNumPassengers((numPassengers) => (
            Math.min(numPassengers + 1, MAX_PASSENGERS)
        ))
    }

    const btnClickedMinus = () => {
        setNumPassengers((numPassengers) => (
            Math.max(MIN_PASSENGERS, numPassengers - 1)
        ))
    }

    const resultFragment = () => {
        if (priceEffect.error) {
            return <p>Error: {priceEffect.error.toString()}</p>
        }

        if (!priceEffect.ready) {
            return <p>
                <strong>Please wait, loading price...</strong>
            </p>
        }

        return <p>
            <strong>Ticket price: ${priceEffect.result}</strong>
        </p>
    }

    return <>
        <div>
            <button onClick={() => btnClickedPlus()}>
                + Add passenger
            </button>
            <button onClick={() => btnClickedMinus()}>
                - Remove passenger
            </button>
            <p>
                Number of passengers: {numPassengers}
            </p>
        </div>
        <div>
            {resultFragment()}
        </div>
    </>
}
```
