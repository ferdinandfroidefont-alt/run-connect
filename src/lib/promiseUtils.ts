/**
 * Limite le temps d’attente d’une promesse (réseau lent, API bloquée).
 * La promesse d’origine continue en arrière-plan ; seul l’await est coupé.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number, label = 'operation'): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const t = setTimeout(() => {
      reject(new Error(`${label}_TIMEOUT_${ms}ms`));
    }, ms);
    promise
      .then(
        (v) => {
          clearTimeout(t);
          resolve(v);
        },
        (e) => {
          clearTimeout(t);
          reject(e);
        }
      );
  });
}
