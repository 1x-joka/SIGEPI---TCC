function validarCPF(cpf) {
  if (!cpf) return false;
  cpf = cpf.replace(/\D/g, '');
  if (cpf.length !== 11 || /^(\d)\1{10}$/.test(cpf)) return false; // rejeita 111.111.111-11 etc.
  let soma = 0;
  for (let i = 0; i < 9; i++) {
    soma += parseInt(cpf[i]) * (10 - i);
  }
  let d1 = (soma * 10) % 11;

  if (d1 === 10) {
    d1 = 0;
  }
  if (d1 !== parseInt(cpf[9])) return false;
  soma = 0;
  for (let i = 0; i < 10; i++) {
    soma += parseInt(cpf[i]) * (11 - i);
  }
  
  let d2 = (soma * 10) % 11;
  if (d2 === 10) {
    d2 = 0;
  }
  return d2 === parseInt(cpf[10]);
}

function validarCNPJ(cnpj) {
  if (!cnpj) return false;
  cnpj = cnpj.replace(/\D/g, '');
  if (cnpj.length !== 14 || /^(\d)\1{13}$/.test(cnpj)) return false;
  const calc = (base, pesos) => {
    let soma = 0;
    for (let i = 0; i < pesos.length; i++) {
      soma += parseInt(base[i]) * pesos[i];
    }
    const r = soma % 11;
    return r < 2 ? 0 : 11 - r;
  };
  const d1 = calc(cnpj, [5,4,3,2,9,8,7,6,5,4,3,2]);
  if (d1 !== parseInt(cnpj[12])) return false;
  const d2 = calc(cnpj, [6,5,4,3,2,9,8,7,6,5,4,3,2]);
  return d2 === parseInt(cnpj[13]);
}

module.exports = { validarCPF, validarCNPJ };