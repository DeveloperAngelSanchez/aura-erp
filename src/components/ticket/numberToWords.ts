/**
 * Convierte un número a su representación en letras en español.
 * Ejemplo: 150.50 → "CIENTO CINCUENTA Y 50/100 SOLES"
 */

const UNIDADES = ['', 'UNO', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const DECENAS = ['', 'DIEZ', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const ESPECIALES = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function convertirGrupo(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';

  let resultado = '';
  const centena = Math.floor(n / 100);
  const resto = n % 100;

  if (centena > 0) {
    resultado = CENTENAS[centena];
    if (resto > 0) resultado += ' ';
  }

  if (resto >= 10 && resto <= 15) {
    resultado += ESPECIALES[resto - 10];
  } else if (resto >= 16 && resto <= 19) {
    resultado += 'DIECI' + UNIDADES[resto - 10].toLowerCase().replace(/^./, c => c.toUpperCase());
    resultado = resultado.replace('DIECI', 'DIECI').toUpperCase();
  } else if (resto >= 21 && resto <= 29) {
    resultado += 'VEINTI' + UNIDADES[resto - 20];
  } else {
    const decena = Math.floor(resto / 10);
    const unidad = resto % 10;
    if (decena > 0) {
      resultado += DECENAS[decena];
      if (unidad > 0) resultado += ' Y ' + UNIDADES[unidad];
    } else if (unidad > 0) {
      resultado += UNIDADES[unidad];
    }
  }

  return resultado;
}

function numeroALetras(n: number): string {
  if (n === 0) return 'CERO';
  if (n < 0) return 'MENOS ' + numeroALetras(Math.abs(n));

  let resultado = '';
  const entero = Math.floor(n);

  if (entero === 0) return 'CERO';

  // Millones
  const millones = Math.floor(entero / 1000000);
  const miles = Math.floor((entero % 1000000) / 1000);
  const unidades = entero % 1000;

  if (millones > 0) {
    if (millones === 1) {
      resultado += 'UN MILLÓN';
    } else {
      resultado += convertirGrupo(millones) + ' MILLONES';
    }
    if (miles > 0 || unidades > 0) resultado += ' ';
  }

  if (miles > 0) {
    if (miles === 1) {
      resultado += 'MIL';
    } else {
      resultado += convertirGrupo(miles) + ' MIL';
    }
    if (unidades > 0) resultado += ' ';
  }

  if (unidades > 0) {
    resultado += convertirGrupo(unidades);
  }

  return resultado;
}

/**
 * Convierte un monto numérico a su representación en letras para un ticket/comprobante.
 * @param amount - El monto total (ej: 150.50)
 * @param currency - El nombre de la moneda (ej: 'SOLES', 'DÓLARES')
 * @returns La cadena formateada (ej: "SON: CIENTO CINCUENTA Y 50/100 SOLES")
 */
export function amountToWords(amount: number, currency: string = 'SOLES'): string {
  const entero = Math.floor(Math.abs(amount));
  const centavos = Math.round((Math.abs(amount) - entero) * 100);
  const centavosStr = centavos.toString().padStart(2, '0');
  const letras = numeroALetras(entero);
  return `SON: ${letras} Y ${centavosStr}/100 ${currency}`;
}
