import Papa from 'papaparse';

function validateCsv(csvContent: string) {
  return Papa.parse(csvContent, {
    header: true,
    skipEmptyLines: true,
    complete: function (results) {
      console.log(results);
    },
  });
}

const csvContent = `Name,Age,City,Occupation,Salary
Alice Johnson,28,New York,Engineer,85000
Bob Smith,34,Los Angeles,Designer,72000
Carol Lee,42,Chicago,Teacher,58000
David Brown,29,Austin,Developer,95000
Emma Davis,31,Seattle,Marketing Manager,78000`;

console.log(validateCsv(csvContent));
