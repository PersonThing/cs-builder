import projectItemTypes from '../../server/project-item-types.js'

export default function stripProjectOfItems(project) {
  const body = JSON.parse(JSON.stringify(project))
  projectItemTypes.forEach(it => {
    if (body.hasOwnProperty(it)) delete body[it]
  })
  return body
}
