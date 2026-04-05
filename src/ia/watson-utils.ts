interface WatsonResponse {
  type: string
  text?: string
  innerhtml?: string
  time?: number
  typing?: boolean
  data?: unknown
}

function getOptions(optionsList: any[], preference: string): any[] & { innerhtml?: string } {
  const arrOptions: any[] & { innerhtml?: string } = []
  let list = ''

  if (optionsList !== null) {
    if (preference === 'text') {
      list = '<ul>'
      for (const opt of optionsList) {
        if (opt.value) {
          list += `<li><div class="options-list" onclick="ConversationPanel.sendMessage('${opt.value.input.text}');" >${opt.label}</div></li>`
          arrOptions.push({ text: opt.value.input.text, label: opt.label })
        }
      }
      list += '</ul>'
    } else if (preference === 'button') {
      list = '<br>'
      for (const opt of optionsList) {
        if (opt.value) {
          list += `<div class="options-button" onclick="ConversationPanel.sendMessage('${opt.value.input.text}');" >${opt.label}</div>`
          arrOptions.push({ text: opt.value.input.text, label: opt.label })
        }
      }
    }
  }

  arrOptions.innerhtml = list
  return arrOptions
}

function getResponse(responses: WatsonResponse[], gen: any): void {
  let title = ''
  let description = ''

  if ('title' in gen) title = gen.title
  if ('description' in gen) description = `<div>${gen.description}</div>`

  if (gen.response_type === 'image') {
    const img = `<div><img src={'${gen.source}'} width={300}></div>`
    responses.push({ type: gen.response_type, innerhtml: title + description + img, data: { img: gen.source, title } })
  } else if (gen.response_type === 'text') {
    responses.push({ type: gen.response_type, text: gen.text })
  } else if (gen.response_type === 'pause') {
    responses.push({ type: gen.response_type, time: gen.time, typing: gen.typing })
  } else if (gen.response_type === 'option') {
    const preference = gen.preference ?? 'text'
    const result = getOptions(gen.options, preference)
    responses.push({ type: gen.response_type, innerhtml: title + description + result.innerhtml, text: title + gen.description, data: result })
  } else if (gen.response_type === 'suggestion') {
    responses.push({ type: gen.response_type, text: gen.title, data: gen.suggestions })
  }
}

export function buildMessageElements(newPayload: any): WatsonResponse[] {
  const responses: WatsonResponse[] = []
  if ('output' in newPayload && 'generic' in newPayload.output) {
    for (const gen of newPayload.output.generic) {
      getResponse(responses, gen)
    }
  }
  return responses
}

export default buildMessageElements
