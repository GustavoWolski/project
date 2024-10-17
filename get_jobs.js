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

  if (palavrasChave === "" || pais === "" || estado === "") {
    let myModal = new bootstrap.Modal(document.getElementById("camposvazios"));
    myModal.show();
    return;
  }

  if (!document.getElementById("loading")) {
    let imgLoading = document.createElement("img");
    imgLoading.id = "loading";
    imgLoading.src = "https://i.giphy.com/VseXvvxwowwCc.webp";
    imgLoading.className = "rounded mx-auto d-block";
    document.getElementById("lista").innerHTML = imgLoading.outerHTML;
  }

  const data = JSON.stringify({
    keywords: palavrasChave,
    location: `${estado}, ${pais}`,
    count: 100,
  });

  let xhr = new XMLHttpRequest();
  xhr.withCredentials = true;

  xhr.onreadystatechange = () => {
    if (xhr.status == 200 && xhr.readyState == 4) {
      show_jobs(JSON.parse(xhr.responseText)["response"][0]);
    }
  };

  xhr.open("POST", "https://linkedin-data-scraper.p.rapidapi.com/search_jobs");
  xhr.setRequestHeader("content-type", "application/json");
  xhr.setRequestHeader(
    "X-RapidAPI-Key",
    "3fcd7f6613msh7f725c1f6459f96p1ae445jsna7ac42d038b1"
  );
  xhr.setRequestHeader(
    "X-RapidAPI-Host",
    "linkedin-data-scraper.p.rapidapi.com"
  );
  xhr.send(data);
}

function sendDescriptionsToApi() {
  if (extractedDescriptions.length === 0) {
        alert('Não há descrições para enviar.');
        return;
    } 

  // Extrair apenas os campos de descrição das vagas
   const descriptionsOnly = extractedDescriptions.map(job => job.jobDescription); 

 /* const descriptionsOnly = [
    "Irá elaborar relatórios gerenciais. Análise de indicadores de performance e de resultados. Desenvolver sistema de coleta.",
    "Estruturar e interpretar dados para análises estatísticas. Ter conhecimento com SQL, Power BI, Linguagem R e Banco de Dados.",
    "Irá elaborar relatórios gerenciais. 📊🚀\nAnálise de indicadores e resultados! 🥇  #123", "If you are a student, graduate or career change aspirant, and you are missing out on the skills to work in your dream job, this bootcamp is for you. Get trained and work on hands-on projects in our bootcamp to upskill yourself! /n Program: Hands-on training and projects, training certification, and project work at our German AI startup – Moyyn (Program language – English) What you will get from this program? – Hands-on training and projects – in a German AI startup– Learn and work – directly with founders and potential clients from Germany– Do practical group Project work and build up experience in Data Science and AI",
    "Desenvolver sistemas e interpretar dados para análises estatísticas e outras estratégias que otimizem a eficiência.",
  ]; */

  let xhr = new XMLHttpRequest();
  xhr.open("POST", "http://localhost:3000/analyze"); // URL da sua API local
  xhr.setRequestHeader("Content-Type", "application/json");

  xhr.onreadystatechange = () => {
    if (xhr.readyState == 4 && xhr.status == 200) {
      displayApiResults(JSON.parse(xhr.responseText));
    }
  };

  // Enviar apenas as descrições para a API
  xhr.send(JSON.stringify({ descriptions: descriptionsOnly }));
}

function displayApiResults(response) {
  console.log(response);
  const apiResultsList = document.getElementById("api-results-list");
  apiResultsList.innerHTML = ""; // Limpa os resultados anteriores

  const frequencyAnalysis = response.frequency; // Acessa o campo 'frequency' do objeto de resposta

  // Verifica se a análise de frequência é válida
  if (frequencyAnalysis && typeof frequencyAnalysis === "object") {
    // Itera sobre as palavras e suas frequências
    for (const [word, count] of Object.entries(frequencyAnalysis)) {
      let item = document.createElement("div");
      item.className = "list-group-item";
      item.textContent = `${word}: ${count} vezes`; // Exibe a palavra e sua contagem
      apiResultsList.appendChild(item);
    }
  } else {
    let item = document.createElement("div");
    item.className = "list-group-item";
    item.textContent = "Nenhuma análise de frequência foi realizada.";
    apiResultsList.appendChild(item);
  }

  // Alterna para a aba de resultados da API
  let apiTab = new bootstrap.Tab(document.getElementById("api-results-tab"));
  apiTab.show();
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
