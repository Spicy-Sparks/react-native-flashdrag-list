import React, { forwardRef, PropsWithChildren, useEffect } from 'react'
import { ViewStyle } from 'react-native'
import Animated, { useAnimatedStyle, useSharedValue, withSpring, useAnimatedReaction } from 'react-native-reanimated'
import { CellContainer } from '@shopify/flash-list'

const AnimatedCellContainer = Animated.createAnimatedComponent(CellContainer)

type Props = PropsWithChildren<{
  index: number,
  activeIndex: Animated.SharedValue<number>,
  insertIndex: Animated.SharedValue<number>,
  height: number,
  active: boolean,
  style?: ViewStyle
}>

const ItemWrapper = forwardRef<any, Props>((props, ref) => {
  const {
    active,
    height,
    insertIndex,
    activeIndex,
    index
  } = props

  const position = useSharedValue(0)

  useEffect(() => {
    if(!active && position.value !== 0)
      position.value = withSpring(0)
  }, [active])

  useAnimatedReaction(() => {
    return insertIndex.value
  }, (newInsertIndex) => {
    if(newInsertIndex < 0 || activeIndex.value < 0) {
      position.value = 0
      return
    }
    else if(index > activeIndex.value && index <= newInsertIndex + 0.5) {
      position.value = withSpring(-height)
      return
    }
    else if(index < activeIndex.value && index >= newInsertIndex - 0.5) {
      position.value = withSpring(height)
      return
    }
    else {
      if(position.value !== 0)
        position.value = withSpring(0)
      return
    }
  }, [index, height, active])

  const animatedStyle = useAnimatedStyle(() => {
    if(active && activeIndex.value === index) {
      return {
        opacity: 0,
        transform: [{
          translateY: 0
        }]
      }
    }
    return {
      opacity: 1,
      transform: [{
        translateY: position.value
      }]
    }
  }, [index, active])

  return (
    <AnimatedCellContainer
      ref={ref}
      {...props}
      style={props.style}
    >
      <Animated.View style={animatedStyle}>
        { props.children }
      </Animated.View>
    </AnimatedCellContainer>
  )
})

export default ItemWrapper
