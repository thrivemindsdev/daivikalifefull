// 1250 -> "One Thousand Two Hundred And Fifty Rupees" (Indian numbering, used on labels and the orders sheet)
export function numberToWords(num) {
  const n = Math.round(Number(num) || 0);
  if (n <= 0) return 'Zero Rupees';
  const units = ['', 'One', 'Two', 'Three', 'Four', 'Five', 'Six', 'Seven', 'Eight', 'Nine', 'Ten', 'Eleven', 'Twelve', 'Thirteen', 'Fourteen', 'Fifteen', 'Sixteen', 'Seventeen', 'Eighteen', 'Nineteen'];
  const tens = ['', '', 'Twenty', 'Thirty', 'Forty', 'Fifty', 'Sixty', 'Seventy', 'Eighty', 'Ninety'];

  const convertLessThanOneThousand = (val) => {
    let str = '';
    if (val >= 100) {
      str += units[Math.floor(val / 100)] + ' Hundred ';
      val %= 100;
      if (val > 0) str += 'And ';
    }
    if (val >= 20) {
      str += tens[Math.floor(val / 10)] + (val % 10 !== 0 ? ' ' + units[val % 10] : ' ');
    } else if (val > 0) {
      str += units[val] + ' ';
    }
    return str;
  };

  let word = '';
  const crore = Math.floor(n / 10000000);
  let remainder = n % 10000000;
  const lakh = Math.floor(remainder / 100000);
  remainder = remainder % 100000;
  const thousand = Math.floor(remainder / 1000);
  remainder = remainder % 1000;

  if (crore > 0) word += convertLessThanOneThousand(crore).trim() + ' Crore ';
  if (lakh > 0) word += convertLessThanOneThousand(lakh).trim() + ' Lakh ';
  if (thousand > 0) word += convertLessThanOneThousand(thousand).trim() + ' Thousand ';
  if (remainder > 0) word += convertLessThanOneThousand(remainder).trim() + ' ';

  return word.trim() + ' Rupees';
}
