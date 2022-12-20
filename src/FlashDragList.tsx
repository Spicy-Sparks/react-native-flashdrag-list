import React, { FunctionComponent, useCallback, useState, useEffect, useRef } from 'react'
import { LayoutChangeEvent } from 'react-native'
import { FlashList, FlashListProps } from "@shopify/flash-list"
import { GestureDetector, Gesture, createNativeWrapper } from 'react-native-gesture-handler'
import Animated, { useSharedValue, runOnJS, useAnimatedScrollHandler } from 'react-native-reanimated'
import ItemWrapper from './ItemWrapper'

const GestureFlashList = createNativeWrapper(FlashList)
const AnimatedFlashList = Animated.createAnimatedComponent(GestureFlashList)

type Props = Omit<FlashListProps<any>, "renderItem"> & {
  data: Array<any>,
  itemsSize: number,
  onSort?: (fromIndex: number, toIndex: number) => any,
  renderItem: (item: any, index: number, beginDrag: () => any) => JSX.Element
}

type Layout = {
  x: number,
  y: number,
  width: number,
  height: number
}

const FlashDragList: FunctionComponent<Props> = (props) => {
  const { itemsSize } = props

  const [ data, setData ] = useState(props.data)

  useEffect(() => {
    setData(data)
  }, [])

  const [ layout, setLayout ] = useState<Layout | null>(null)

  const scrollview = useRef<FlashList<any>>(null)

  const activeIndex = useSharedValue(-1)
  const [ active, setActive ] = useState(false)
  const insertIndex = useSharedValue(-1)

  const scroll = useSharedValue(0)
  const autoScrollSpeed = useSharedValue(0)

  const pan = useSharedValue(0)
  const panAbs = useSharedValue(0)
  const panScroll = useSharedValue(0)
  const panOffset = useSharedValue(0)

  const endDrag = (fromIndex: number, toIndex: number) => {
    const copy = [...data]
    const removed = copy.splice(fromIndex, 1)
    copy.splice(toIndex, 0, removed[0])
    setData(copy)
    setActive(false)
    pan.value = 0
    panOffset.value = 0
    panAbs.value = -1
    panScroll.value = 0
    activeIndex.value = -1
    insertIndex.value = -1
    autoScrollSpeed.value = 0
    props.onSort?.(fromIndex, toIndex)
  }

  const beginDrag = useCallback((index: number) => {
    setActive(true)
    activeIndex.value = index
  }, [])

  useEffect(() => {
    const scrollInterval = setInterval(() => {
      if(!scrollview.current || autoScrollSpeed.value === 0)
        return
      scrollview.current.scrollToOffset({
        offset: scroll.value + autoScrollSpeed.value,
        animated: false
      })
      pan.value = panAbs.value - panOffset.value - (panScroll.value - scroll.value)
    }, 10)
    return () => {
      clearInterval(scrollInterval)
    }
  }, [])

  const scrollHandler = useAnimatedScrollHandler((event) => {
    scroll.value = event.contentOffset.y
  })

  const onLayout = useCallback((evt: LayoutChangeEvent) => {
    setLayout(evt.nativeEvent.layout)
  }, [])

  const panGesture = Gesture.Pan()
  .enabled(layout !== null)
  .shouldCancelWhenOutside(false)
  .onBegin((evt) => {
    panAbs.value = evt.absoluteY
    panScroll.value = scroll.value
    panOffset.value = panAbs.value
    insertIndex.value = Math.max(0, ((scroll.value + panAbs.value - (layout?.y || 0)) / itemsSize) - 0.5)
  })
  .onUpdate((evt) => {
    panAbs.value = evt.absoluteY
    pan.value = panAbs.value - panOffset.value - (panScroll.value - scroll.value)
    insertIndex.value = Math.max(0, ((scroll.value + panAbs.value - (layout?.y || 0)) / itemsSize) - 0.5)
    if(layout) {
      if(panAbs.value >= layout.y + layout.height - 100)
        autoScrollSpeed.value = 3
      else if(panAbs.value < layout.y + 100)
        autoScrollSpeed.value = -3
      else
        autoScrollSpeed.value = 0
    }
    else autoScrollSpeed.value = 0
  })
  .onEnd(() => {
    if(activeIndex.value < 0)
      return
    const fromIndex = activeIndex.value
    const toIndex = Math.round(insertIndex.value)
    runOnJS(endDrag)(fromIndex, toIndex)
  })

  const renderItem = ({ item, index }: any) => {
    return props.renderItem(item, index, () => beginDrag(index))
  }

  return (
    <GestureDetector gesture={panGesture}>
      <Animated.View
        onLayout={onLayout}
        style={{
          flex: 1
        }}
      >
        <AnimatedFlashList
          { ...props }
          // @ts-ignore
          ref={scrollview}
          data={data}
          renderItem={renderItem}
          keyExtractor={(item: any) => item.title}
          CellRendererComponent={(props) => <ItemWrapper
            { ...props }
            activeIndex={activeIndex}
            insertIndex={insertIndex}
            height={itemsSize}
            pan={pan}
          /> }
          estimatedItemSize={props.estimatedItemSize ?? itemsSize}
          scrollEnabled={(props.scrollEnabled ?? true) && !active}
          onScroll={scrollHandler}
          scrollEventThrottle={16}
        />
      </Animated.View>
    </GestureDetector>
  )
}

export default FlashDragList
