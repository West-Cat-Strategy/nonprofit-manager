#!/bin/bash
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
source "$SCRIPT_DIR/lib/common.sh"

PORTS="${E2E_REQUIRED_PORTS:-3001 5173}"
PORT_ACTION="${E2E_PORT_ACTION:-fail}" # fail | kill | warn
PORT_STABILITY_CHECKS="${E2E_PORT_STABILITY_CHECKS:-3}"
PORT_MAX_CHECKS="${E2E_PORT_MAX_CHECKS:-15}"
PORT_CHECK_INTERVAL_SECONDS="${E2E_PORT_CHECK_INTERVAL_SECONDS:-1}"

collect_listener_pids() {
    local collected=""
    local port
    for port in $PORTS; do
        local pids
        pids="$(lsof -nP -tiTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
        if [ -n "$pids" ]; then
            collected="${collected}"$'\n'"$pids"
        fi
    done

    if [ -n "$collected" ]; then
        echo "$collected" | tr ' ' '\n' | sed '/^$/d' | sort -u
    fi
}

log_port_usage() {
    local port
    for port in $PORTS; do
        local listeners
        listeners="$(lsof -nP -iTCP:"$port" -sTCP:LISTEN 2>/dev/null || true)"
        if [ -n "$listeners" ]; then
            log_warn "Port $port is currently in use:"
            echo "$listeners"
        fi
    done
}

kill_stale_listeners() {
    local pids
    pids="$(collect_listener_pids)"
    if [ -z "$pids" ]; then
        return 0
    fi

    log_warn "Terminating stale listeners on E2E ports..."
    echo "$pids" | xargs -r kill || true
    sleep 1

    local remaining
    remaining="$(collect_listener_pids)"
    if [ -n "$remaining" ]; then
        log_warn "Force-killing remaining listeners..."
        echo "$remaining" | xargs -r kill -9 || true
        sleep 1
    fi
}

stabilize_port_state() {
    local stable_checks=0
    local check=1

    while [ "$check" -le "$PORT_MAX_CHECKS" ]; do
        local existing
        existing="$(collect_listener_pids)"

        if [ -z "$existing" ]; then
            stable_checks=$((stable_checks + 1))
            if [ "$stable_checks" -ge "$PORT_STABILITY_CHECKS" ]; then
                return 0
            fi
            sleep "$PORT_CHECK_INTERVAL_SECONDS"
            check=$((check + 1))
            continue
        fi

        stable_checks=0
        log_port_usage
        case "$PORT_ACTION" in
            kill)
                kill_stale_listeners
                ;;
            warn)
                log_warn "Proceeding with occupied E2E ports due to E2E_PORT_ACTION=warn."
                return 0
                ;;
            fail|*)
                log_error "E2E ports are occupied. Stop stale services or set E2E_PORT_ACTION=kill."
                return 1
                ;;
        esac

        sleep "$PORT_CHECK_INTERVAL_SECONDS"
        check=$((check + 1))
    done

    local final_listeners
    final_listeners="$(collect_listener_pids)"
    if [ -z "$final_listeners" ] && [ "$stable_checks" -ge "$PORT_STABILITY_CHECKS" ]; then
        return 0
    fi

    if [ "$PORT_ACTION" = "kill" ]; then
        log_error "E2E ports failed stability checks after ${PORT_MAX_CHECKS} probe attempts."
        log_port_usage
        return 1
    fi

    return 0
}

main() {
    if ! stabilize_port_state; then
        return 1
    fi

    log_success "E2E port preflight passed (ports stable and ready: $PORTS)."
}

main "$@"
