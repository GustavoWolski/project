let extractedDescriptions = [];
let currentPage = 1;
const resultsPerPage = 5;

function formatarData(data) {
  const agora = new Date();
  const dataLista = new Date(data);
  const diferenca = agora.getTime() - dataLista.getTime();
  const segundos = Math.floor(diferenca / 1000);
  const minutos = Math.floor(segundos / 60);
  const horas = Math.floor(minutos / 60);
  const dias = Math.floor(horas / 24);
  const semanas = Math.floor(dias / 7);
  const meses = Math.floor(dias / 30);
  const anos = Math.floor(dias / 365);

  if (segundos < 60) {
    return "há " + segundos + " segundos";
  } else if (minutos < 60) {
    return "há " + minutos + " minutos";
  } else if (horas < 24) {
    return "há " + horas + " horas";
  } else if (dias < 7) {
    return "há " + dias + " dias";
  } else if (semanas < 4) {
    return "há " + semanas + " semanas";
  } else if (meses < 12) {
    return "há " + meses + " meses";
  } else {
    return "há " + anos + " anos";
  }
}

function show_jobs(jobs) {
  extractedDescriptions = jobs; // Armazena as descrições completas
  renderPage(currentPage);
  document.getElementById("send-to-api-btn").classList.remove("disabled"); // Habilita o botão
}

function renderPage(page) {
  const startIndex = (page - 1) * resultsPerPage;
  const endIndex = startIndex + resultsPerPage;
  const jobsToDisplay = extractedDescriptions.slice(startIndex, endIndex);

  const listElement = document.getElementById("lista");
  listElement.innerHTML = "";

  jobsToDisplay.forEach((job, index) => {
    let group_item = document.createElement("a");
    group_item.className = "list-group-item list-group-item-action";
    group_item.href = job.jobPostingUrl; // Link para a vaga
    group_item.target = "_blank"; // Abre o link em uma nova guia

    let header = document.createElement("div");
    header.className = "d-flex w-100 justify-content-between";

    let title = document.createElement("h5");
    title.className = "mb-1";
    title.innerHTML = job.title; // Título da vaga

    let location = document.createElement("p");
    location.className = "mb-1";
    location.innerHTML = `<strong>Local:</strong> ${job.formattedLocation}`; // Local da vaga

    let description = document.createElement("p");
    let limitedDescription = job.jobDescription.slice(0, 200);
    if (job.jobDescription.length > 200) {
      limitedDescription += "...";
    }
    description.innerHTML = `<strong>Descrição:</strong> ${limitedDescription}`; // Descrição da vaga

    let date = document.createElement("small");
    let dataFormatada = formatarData(job.listedAt);
    date.innerHTML = `<strong>Publicado:</strong> ${dataFormatada}`; // Data da vaga

    group_item.appendChild(header);
    header.appendChild(title);
    group_item.appendChild(location);
    group_item.appendChild(description);
    group_item.appendChild(date);
    listElement.appendChild(group_item);
  });

  renderPagination();
}

function renderPagination() {
  const totalPages = Math.ceil(extractedDescriptions.length / resultsPerPage);
  const paginationContainer = document.getElementById("pagination");
  paginationContainer.innerHTML = "";

  // Botão Anterior
  const prevButton = document.createElement("button");
  prevButton.className = "btn btn-secondary me-2";
  prevButton.textContent = "Anterior";
  prevButton.onclick = () => changePage(currentPage - 1);
  prevButton.disabled = currentPage === 1;
  paginationContainer.appendChild(prevButton);

  // Números de páginas com elipses
  const maxPagesToShow = 5;
  let startPage = Math.max(1, currentPage - 2);
  let endPage = Math.min(totalPages, currentPage + 2);

  if (totalPages > maxPagesToShow) {
    if (startPage > 1) {
      paginationContainer.appendChild(createPageButton(1));
      if (startPage > 2) {
        const dots = document.createElement("span");
        dots.className = "mx-1";
        dots.textContent = "...";
        paginationContainer.appendChild(dots);
      }
    }
  }

  for (let i = startPage; i <= endPage; i++) {
    paginationContainer.appendChild(createPageButton(i));
  }

  if (totalPages > maxPagesToShow && endPage < totalPages) {
    if (endPage < totalPages - 1) {
      const dots = document.createElement("span");
      dots.className = "mx-1";
      dots.textContent = "...";
      paginationContainer.appendChild(dots);
    }
    paginationContainer.appendChild(createPageButton(totalPages));
  }

  // Botão Próxima
  const nextButton = document.createElement("button");
  nextButton.className = "btn btn-secondary";
  nextButton.textContent = "Próxima";
  nextButton.onclick = () => changePage(currentPage + 1);
  nextButton.disabled = currentPage === totalPages;
  paginationContainer.appendChild(nextButton);
}

function createPageButton(pageNumber) {
  const pageButton = document.createElement("button");
  pageButton.className = "btn btn-light mx-1";
  pageButton.textContent = pageNumber;
  pageButton.onclick = () => changePage(pageNumber);
  if (pageNumber === currentPage) {
    pageButton.classList.add("btn-primary");
    pageButton.classList.remove("btn-light");
  }
  return pageButton;
}

function changePage(newPage) {
  currentPage = newPage;
  renderPage(currentPage);
}

function get_jobs() {
  let palavrasChave = document.getElementById("palavrasChave").value;
  let pais = document.getElementById("pais").value;
  let estado = document.getElementById("estado").value;

  const cacheKey = `${palavrasChave}-${estado}-${pais}`;
  const cachedData = localStorage.getItem(cacheKey);
  const lastFetch = localStorage.getItem(`${cacheKey}-timestamp`);
  const expirationTime = 24 * 60 * 60 * 1000; // 24 horas em milissegundos

  // Verificar cache e expiração
  if (cachedData && lastFetch && (Date.now() - lastFetch) < expirationTime) {
    show_jobs(JSON.parse(cachedData));
    return;
  }

  // Verificar se os campos estão preenchidos
  if (!palavrasChave || !pais || !estado) {
    let myModal = new bootstrap.Modal(document.getElementById("camposvazios"));
    myModal.show();
    return;
  }

  // Tela de carregamento
  if (!document.getElementById("loading")) {
    let imgLoading = document.createElement("img");
    imgLoading.id = "loading";
    imgLoading.src = "https://i.giphy.com/VseXvvxwowwCc.webp";
    imgLoading.className = "rounded mx-auto d-block";
    document.getElementById("lista").innerHTML = imgLoading.outerHTML;
  }

  // Requisição para a API
  const data = JSON.stringify({
    keywords: palavrasChave,
    location: `${estado}, ${pais}`,
    count: 100,
  });

  let xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.onreadystatechange = () => {
    if (xhr.status == 200 && xhr.readyState == 4) {
      const response = JSON.parse(xhr.responseText)["response"][0];
      show_jobs(response);

      // Armazena a resposta e o timestamp no localStorage
      localStorage.setItem(cacheKey, JSON.stringify(response));
      localStorage.setItem(`${cacheKey}-timestamp`, Date.now());
    }
  };

  xhr.open("POST", "https://linkedin-data-scraper.p.rapidapi.com/search_jobs");
  xhr.setRequestHeader("content-type", "application/json");
  xhr.setRequestHeader("X-RapidAPI-Key", "3fcd7f6613msh7f725c1f6459f96p1ae445jsna7ac42d038b1");
  xhr.setRequestHeader("X-RapidAPI-Host", "linkedin-data-scraper.p.rapidapi.com");

  xhr.send(data);
}

function sendDescriptionsToApi() {
  // Verificar se há descrições para enviar
  if (extractedDescriptions.length === 0) {
    alert("Não há descrições para enviar.");
    return;
  }

  // Alterna para a aba de resultados
  let apiTab = new bootstrap.Tab(document.getElementById("api-results-tab"));
  apiTab.show();

  // Tela de loading para aguardar os resultados
  if (!document.getElementById("loading")) {
    let imgLoading = document.createElement("img");
    imgLoading.id = "loading";
    imgLoading.src = "https://i.giphy.com/VseXvvxwowwCc.webp";
    imgLoading.className = "rounded mx-auto d-block";
    document.getElementById("api-results-list").innerHTML = imgLoading.outerHTML;
  }

  // Extrair apenas os campos de descrição das vagas
  const descriptionsOnly = extractedDescriptions.map(job => job.jobDescription);

  // Criar instância de XMLHttpRequest
  let xhr = new XMLHttpRequest();
  xhr.open("POST", "http://localhost:3000/analyze"); // URL da sua API local
  xhr.setRequestHeader("Content-Type", "application/json");

  // Manipulação de respostas e erros
  xhr.onreadystatechange = () => {
    if (xhr.readyState === 4) {
      // Remover a tela de loading
      const loadingElement = document.getElementById("loading");
      if (loadingElement) {
        loadingElement.remove();
      }

      // Verificar o status da resposta
      if (xhr.status === 200) {
        try {
          const response = JSON.parse(xhr.responseText);
          displayApiResults(response);
          console.log(response);
        } catch (err) {
          console.error("Erro ao processar a resposta da API:", err);
          alert("Erro ao processar a resposta da API. Tente novamente.");
        }
      } else {
        // Tratar erros de status HTTP
        console.error("Erro ao se comunicar com a API. Status:", xhr.status);
        let errorMessage = "Ocorreu um erro ao se comunicar com a API.";
        if (xhr.status === 0) {
          errorMessage += " Verifique se a API está em execução.";
        } else if (xhr.status >= 400 && xhr.status < 500) {
          errorMessage += " Verifique os dados enviados.";
        } else if (xhr.status >= 500) {
          errorMessage += " Houve um problema no servidor da API.";
        }
        alert(errorMessage);
      }
    }
  };

  // Tratar erros na criação e envio da requisição
  try {
    // Enviar apenas as descrições para a API
    xhr.send(JSON.stringify({ descriptions: descriptionsOnly }));
  } catch (err) {
    console.error("Erro ao enviar dados para a API:", err);
    alert("Ocorreu um erro inesperado. Tente novamente.");
  }
}

//----------------------- Exibir os resultados retornados da api de competencias na página----------------------

function displayApiResults(response) {
  const apiResultsList = document.getElementById("api-results-list");
  apiResultsList.innerHTML = ""; // Limpa os resultados anteriores

  const bigramFrequencies = response.bigram_frequencies;
  const trigramFrequencies = response.trigram_frequencies;
  const wordFrequencies = response.word_frequencies;

  // Função para criar uma tabela de frequências, com limite de 10 resultados
  function createFrequencyTable(frequencies, title) {
    let table = document.createElement("table");
    table.className = "table table-striped table-bordered mt-3";

    // Cabeçalho da tabela
    let thead = document.createElement("thead");
    let headerRow = document.createElement("tr");
    let wordHeader = document.createElement("th");
    wordHeader.textContent = title;
    let countHeader = document.createElement("th");
    countHeader.textContent = "Frequência";
    headerRow.appendChild(wordHeader);
    headerRow.appendChild(countHeader);
    thead.appendChild(headerRow);
    table.appendChild(thead);

    // Corpo da tabela
    let tbody = document.createElement("tbody");

    // Ordenar as frequências e limitar a exibição a 10
    const sortedFrequencies = Object.entries(frequencies)
      .sort((a, b) => b[1] - a[1]) // Ordena por frequência
      .slice(0, 25); // Limita aos 10 primeiros

    // Iterar sobre as frequências limitadas
    sortedFrequencies.forEach(([word, count]) => {
      let row = document.createElement("tr");
      let wordCell = document.createElement("td");
      wordCell.textContent = word;
      let countCell = document.createElement("td");
      countCell.textContent = count;
      row.appendChild(wordCell);
      row.appendChild(countCell);
      tbody.appendChild(row);
    });

    table.appendChild(tbody);
    return table;
  }

  // Criar e armazenar as tabelas
  const tables = {
    words: createFrequencyTable(wordFrequencies, "Palavras"),
    bigrams: createFrequencyTable(bigramFrequencies, "Bigramas"),
    trigrams: createFrequencyTable(trigramFrequencies, "Trigramas"),
  };

  // Função para alternar entre as tabelas
  function showTable(tableType) {
    apiResultsList.innerHTML = ""; // Limpa os resultados anteriores
    apiResultsList.appendChild(tables[tableType]);

    // Atualiza os botões
    document.getElementById('btn-words').className = 'btn btn-secondary';
    document.getElementById('btn-bigrams').className = 'btn btn-secondary';
    document.getElementById('btn-trigrams').className = 'btn btn-secondary';
    document.getElementById(`btn-${tableType}`).className = 'btn btn-primary';
  }

  // Exibe a tabela de palavras por padrão
  showTable('words');

  // Define a função global para alternar entre as tabelas
  window.showTable = showTable;
  
}

//------------Atalhos--------------//
// Seleciona os campos de entrada e o botão de pesquisa
const inputPalavrasChave = document.getElementById("palavrasChave");
const inputPais = document.getElementById("pais");
const inputEstado = document.getElementById("estado");
const searchButton = document.getElementById("pesquisa");

// Função para adicionar o listener de tecla Enter
function addEnterKeyListener(input) {
  input.addEventListener("keydown", function (event) {
    if (event.key === "Enter") {
      // Verifica se a tecla Enter foi pressionada
      searchButton.click(); // Simula o clique no botão de pesquisa
    }
  });
}

// Adiciona o listener para cada campo de entrada
addEnterKeyListener(inputPalavrasChave);
addEnterKeyListener(inputPais);
addEnterKeyListener(inputEstado);


