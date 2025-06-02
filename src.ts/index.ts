/**
 * useAsyncEffect - safely use async/await within React effects
 *
 * Original code by François Zaninotto from: https://marmelab.com/blog/2023/01/11/use-async-effect-react.html
 * Modified by Michał Leszczyński (icedev.pl)
 */

import {useEffect, useState, useMemo, useRef, type DependencyList} from 'react'

export class SkipEffect extends Error {
    constructor() {
        super()
        this.name = "SkipEffect"
        Object.setPrototypeOf(this, SkipEffect.prototype)
    }
}

interface IUseAsyncEffectResultNotInitialized {
    initialized: false
    ready: false
    result: unknown
    error: unknown
}

interface IUseAsyncEffectResultInitialized<ReturnType> {
    initialized: true
    ready: boolean
    result: ReturnType
    error: undefined
}

interface IEnsureResultFunction<ReturnType> {
    (): ReturnType
}

type TUseAsyncEffectState<ReturnType> =
    IUseAsyncEffectResultNotInitialized
    | IUseAsyncEffectResultInitialized<ReturnType>

export type TUseAsyncEffectResult<ReturnType> =
    TUseAsyncEffectState<ReturnType>
    & {ensureResult: IEnsureResultFunction<ReturnType>}

// TODO version that runs effects sequentially and skips ones that are not needed

export function useAsyncEffectState<ReturnType>(
    onMount: (isMounted: () => boolean) => Promise<ReturnType>,
    onError?: (error: unknown) => void,
    deps?: DependencyList,
): TUseAsyncEffectResult<ReturnType> {
    const isMounted = useRef(false)
    const [resultState, setResultState] = useState<TUseAsyncEffectState<ReturnType>>({
        initialized: false, // whether result is present (could be stale!)
        ready: false, // whether a fresh result is present
        result: undefined, // last result that was recorded
        error: undefined // last error that was recorded
    })

    useEffect(() => {
        isMounted.current = true
        return () => {
            isMounted.current = false
        }
    }, [])

    useEffect(() => {
        let ignore = false;

        (async () => {
            await Promise.resolve() // wait for the initial cleanup in Strict mode - avoids double mutation

            if (!isMounted.current || ignore) {
                return
            }

            setResultState((prevState) => ({
                ...prevState,
                ready: false,
            }))

            try {
                const result = await onMount(() => (isMounted.current && !ignore))

                if (isMounted.current && !ignore) {
                    // onMount was successful and this effect is the most recent one, update result
                    setResultState((prevState) => ({
                        ...prevState,
                        initialized: true,
                        ready: true,
                        result: result,
                        error: undefined,
                    }))
                }
            } catch (error) {
                if (!isMounted.current || ignore) {
                    return
                }

                if (error instanceof SkipEffect) {
                    // the onMount() callback said that it doesn't want to alter the current state
                    setResultState((prevState) => {
                        if (prevState.initialized) {
                            // declare previous cached result as fresh
                            return {
                                ...prevState,
                                ready: true,
                            }
                        } else {
                            // declare that we still didn't initialize yet
                            return {
                                ...prevState,
                                ready: false,
                            }
                        }
                    })
                    return
                }

                setResultState({
                    initialized: false,
                    ready: false,
                    result: undefined,
                    error: error,
                })

                if (onError) {
                    onError(error)
                }
            }
        })()

        return () => {
            ignore = true
        }
    }, deps)

    return useMemo(() => ({
        ...resultState,
        ensureResult: () => {
            if (resultState.error) {
                throw resultState.error
            } else if (!resultState.initialized || !resultState.ready) {
                throw new Error("Result is not available.")
            }

            return resultState.result
        },
    }), [resultState])
}
