/**
 * useAsyncEffect - safely use async/await within React effects
 *
 * Original code by François Zaninotto from: https://marmelab.com/blog/2023/01/11/use-async-effect-react.html
 * Modified by Michał Leszczyński (icedev.pl)
 */

import {useEffect, useState, useMemo, useRef, type DependencyList} from 'react'

interface IUseAsyncEffectResultNotReady {
    ready: false
    result: unknown
    error: unknown
}

interface IUseAsyncEffectResultReady<ReturnType> {
    ready: true
    result: ReturnType
    error: undefined
}

export type TUseAsyncEffectResult<ReturnType> =
    IUseAsyncEffectResultNotReady
    | IUseAsyncEffectResultReady<ReturnType>

export function useAsyncEffectState<ReturnType>(
    onMount: (isMounted: () => boolean) => Promise<ReturnType>,
    onError?: (error: unknown) => void,
    deps?: DependencyList,
): TUseAsyncEffectResult<ReturnType> {
    const isMounted = useRef(false)
    const [resultState, setResultState] = useState<TUseAsyncEffectResult<ReturnType>>({
        ready: false,
        result: undefined,
        error: undefined
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
            setResultState({ready: false, result: undefined, error: undefined})
            try {
                const result = await onMount(() => (isMounted.current && !ignore))

                if (isMounted.current && !ignore) {
                    setResultState({ready: true, result: result, error: undefined})
                }
            } catch (error) {
                if (!isMounted.current || ignore) return
                setResultState({ready: false, result: undefined, error: error})
                if (onError) {
                    onError(error)
                }
            }
        })()

        return () => {
            ignore = true
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, deps)

    return useMemo(() => ({
        ...resultState
    }), [resultState])
}
