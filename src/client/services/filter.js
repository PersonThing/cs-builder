export default function (list, search) {
  list = list || null
  if (list == null) return null
  if (search == null || search === '') return list

  const tempSearch = search.trim().toLowerCase()

  // return only results that, when serialized to json, contain the text passed
  // omit profilePicture from the serialization to avoid false positives
  const results = list.filter(item => JSON.stringify(item).toLowerCase().indexOf(tempSearch) > -1)
  return results
}
