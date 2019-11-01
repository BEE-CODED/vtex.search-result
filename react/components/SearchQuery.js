import { zip, split, head, join, tail } from 'ramda'
import { useMemo, useRef } from 'react'
import { useQuery } from 'react-apollo'
import {
  productSearchV2 as productSearchQuery,
  searchMetadata as searchMetadataQuery,
} from 'vtex.store-resources/Queries'

const DEFAULT_PAGE = 1

const QUERY_SEPARATOR = '/'
const MAP_SEPARATOR = ','

const splitQuery = split(QUERY_SEPARATOR)
const splitMap = split(MAP_SEPARATOR)
const joinQuery = join(QUERY_SEPARATOR)
const joinMap = join(MAP_SEPARATOR)

const includeFacets = (map, query) =>
  !!(map && map.length > 0 && query && query.length > 0)

const useCorrectPage = ({ page, query, map, orderBy }) => {
  const pageRef = useRef(page)
  const queryRef = useRef(query)
  const mapRef = useRef(map)
  const orderByRef = useRef(orderBy)
  const isCurrentDifferent = (ref, currentVal) => ref.current !== currentVal
  if (
    isCurrentDifferent(queryRef, query) ||
    isCurrentDifferent(mapRef, map) ||
    isCurrentDifferent(orderByRef, orderBy)
  ) {
    pageRef.current = DEFAULT_PAGE
  }
  return pageRef.current
}

const SearchQuery = ({
  maxItemsPerPage,
  query,
  map,
  orderBy,
  priceRange,
  hideUnavailableItems,
  pageQuery,
  children,
}) => {
  /* This is the page of the first query since the component was rendered. 
  We want this behaviour so we can show the correct items even if the pageQuery
  changes. It should change only on a new render or if the query or orderby 
  change, hence the useCorrectPage that updates its value*/
  const page = useCorrectPage({
    page: pageQuery ? parseInt(pageQuery) : DEFAULT_PAGE,
    query,
    map,
    orderBy,
  })
  const from = (page - 1) * maxItemsPerPage
  const to = from + maxItemsPerPage - 1

  const facetsArgs = {
    facetQuery: query,
    facetMap: map,
    includeFacets: includeFacets(map, query),
  }
  const variables = useMemo(() => {
    return {
      query,
      map,
      orderBy,
      priceRange,
      from,
      to,
      hideUnavailableItems,
      ...facetsArgs,
    }
  }, [
    query,
    map,
    orderBy,
    priceRange,
    from,
    to,
    hideUnavailableItems,
    facetsArgs,
  ])
  const extraParams = useMemo(() => {
    return {
      ...variables,
      maxItemsPerPage,
      page,
    }
  }, [variables, maxItemsPerPage, page])

  const productSearchResult = useQuery(productSearchQuery, {
    ssr: false,
    variables,
  })
  const { data: { searchMetadata } = {} } = useQuery(searchMetadataQuery, {
    variables: {
      query: variables.query,
      map: variables.map,
    },
  })

  const searchInfo = useMemo(
    () => ({
      ...(productSearchResult || {}),
      data: {
        productSearch:
          productSearchResult.data && productSearchResult.data.productSearch,
        facets: productSearchResult.data && productSearchResult.data.facets,
        searchMetadata,
      },
    }),
    [productSearchResult, searchMetadata]
  )

  return children(searchInfo, extraParams)
}

export default SearchQuery
